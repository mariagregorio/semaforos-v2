import Konva from "konva";
import {startTooltips} from './tooltips';
import {startTabs} from './tabs';
import Splide from '@splidejs/splide';
import * as colorjoe from 'colorjoe'
import Quill from 'quill';


startTooltips();

const STAGE_W = 500;
const STAGE_H = 500;
let mode = null;
let imageObj = new Image();
let drawingInProgress = false;
let polygonInProgress = [];
let lastClickCoords = [];
let deletePolygon = false;
let currentScreen = 'drawing';
let secondStage = new Konva.Stage({
    container: 'canvasContainer2',
    width: 500,
    height: 500,
});
let selectedPolygon = null;
const polygonsData = [];

if(!demo) {
    let stageWrapper = document.getElementById('drawingScreenCanvasWrapper');
    let stage = new Konva.Stage({
        container: 'canvasContainer',
        width: stageWrapper.offsetWidth,
        height: STAGE_H
    });

    let imageLayer = new Konva.Layer();
    let drawingLayer = new Konva.Layer();
    let polygonInProgressLayer = new Konva.Layer();
    let guideLayer = new Konva.Layer();

    const drawingBoard = new Konva.Rect({
        x: 0,
        y: 0,
        width: stage.width(),
        height: stage.height(),
        fill: '#f1f1f1'
    });

    const polygonSelectedToolbar = document.getElementById('polygonSelectedToolbar');

    drawingLayer.add(drawingBoard);
    stage.add(drawingLayer);
    drawingLayer.draw();

    stage.add(polygonInProgressLayer);

    let guide = new Konva.Line({
        points: [],
        stroke: 'red',
        strokeWidth: 1
    });

    stage.add(imageLayer);

    let edificio = new Konva.Image({
        x: 0,
        y: 0,
        image: null
    });

    const fileInput = document.getElementById('file');
    fileInput.addEventListener('change', (e) => {
        const stageWidth = stageWrapper.offsetWidth;
        imageObj.src = URL.createObjectURL(e.target.files[0]);
        imageObj.onload = function () {
            edificio.image(imageObj);
            if (imageObj.width > stageWidth) {
                // resize image when bigger that stage
                const scale = Math.round(stageWidth * 100 / imageObj.width);
                edificio.width(stageWidth)
                edificio.height(scale * imageObj.height / 100)
            } else {
                edificio.width(imageObj.width)
                edificio.height(imageObj.height)
            }
            stage.width(edificio.width());
            stage.height(edificio.height());
            drawingBoard.width(edificio.width());
            drawingBoard.height(edificio.height());
            drawingBoard.fill('transparent');
            drawingLayer.draw();
            imageLayer.zIndex(0);
            imageLayer.add(edificio);
            imageLayer.batchDraw();
        };
    });

    const btnSelect = document.getElementById('btnSelect');
    btnSelect.addEventListener('click', (e) => {
        changeMode('select')
    });

    const btnDraw = document.getElementById('btnDraw');
    btnDraw.addEventListener('click', (e) => {
        changeMode('draw');
    });

    const btnResize = document.getElementById('btnResize');
    btnResize.addEventListener('click', (e) => {
        changeMode('resize');
    });

    const btnDelete = document.getElementById('btnDelete');
    btnDelete.addEventListener('click', (e) => {
        if(deletePolygon) {
            if(mode === 'resize') {
                const nodes = transformer.nodes();
                if(nodes.length > 0) {
                    const children = drawingLayer.getChildren(node => {
                        return node === nodes[0];
                    });
                    if(children.length > 0) {
                        children[0].destroy();
                        const polygonIndex = polygonsData.findIndex((polygon) => polygon.id === children[0]._id);
                        polygonsData.splice(polygonIndex, 1);
                    }
                    stopEditPolygon();
                    document.getElementById('deleteBtnTtip').classList.add('hide');
                }
            }
            if(mode === 'select' && selectedPolygon) {
                let nodes = drawingLayer.getChildren((node) => {return node === selectedPolygon});
                if(nodes.length > 0) {
                    nodes[0].destroy();
                    const polygonIndex = polygonsData.findIndex((polygon) => polygon.id === nodes[0]._id);
                    polygonsData.splice(polygonIndex, 1);
                    polygonSelectedToolbar.classList.add('hide');
                    stopEditPolygon();
                    selectedPolygon = null;
                }
                deletePolygon = false;
            }
            //force hide tooltip for delete btn
            document.getElementById('deleteBtnTtip').classList.add('hide');
        }
    });

    const changeMode = (modeValue) => {
        if(drawingInProgress) {
            guideLayer.clear();
            polygonInProgressLayer.clear();
            polygonInProgressLayer.destroyChildren();
            drawingInProgress = false;
        }
        mode = modeValue;
        switch(modeValue) {
            case 'draw':
                btnDraw.classList.add('active');
                btnResize.classList.remove('active');
                btnSelect.classList.remove('active');
                quitSelecting();
                stopEditPolygon();
                break;
            case 'resize':
                btnResize.classList.add('active');
                btnDraw.classList.remove('active');
                btnSelect.classList.remove('active');
                quitSelecting();
                break;
            case 'select':
                btnSelect.classList.add('active');
                btnResize.classList.remove('active');
                btnDraw.classList.remove('active');
                stopEditPolygon();
                selecting();
                break;
        }
    };

    // toggle color picker
    const polygonColorPickerWrapper = document.getElementById('polygonColorPickerWrapper');
    const colorPickerTrigger = document.getElementById('colorPickerTrigger');
    colorPickerTrigger.addEventListener('click', (e) => {
        if(polygonColorPickerWrapper.classList.contains('hide')) {
            polygonColorPickerWrapper.classList.remove('hide');
        } else {
            polygonColorPickerWrapper.classList.add('hide');
        }
    });
    // toggle hover color picker
    const polygonHoverColorPickerWrapper = document.getElementById('polygonHoverColorPickerWrapper');
    const hoverColorPickerTrigger = document.getElementById('hoverColorPickerTrigger');
    hoverColorPickerTrigger.addEventListener('click', (e) => {
        if(polygonHoverColorPickerWrapper.classList.contains('hide')) {
            polygonHoverColorPickerWrapper.classList.remove('hide');
        } else {
            polygonHoverColorPickerWrapper.classList.add('hide');
        }
    });

    // Create color picker for a polygon
    const createToolbarColor = (polygon, polygonIndex) => {
        if(polygonColorPickerWrapper.childNodes.length > 0) {
            polygonColorPickerWrapper.removeChild(polygonColorPickerWrapper.childNodes[0]);
        }
        const polygonColorPickerElement = document.createElement('div');
        polygonColorPickerElement.id = 'polygonColorPicker';
        polygonColorPickerElement.classList.add('colorPicker');
        polygonColorPickerWrapper.appendChild(polygonColorPickerElement);
        const polygonColorPicker = colorjoe.rgb('polygonColorPicker', polygonsData[polygonIndex].color);
        const colorCode = document.getElementById('colorCode');
        colorCode.innerText = polygonsData[polygonIndex].color;
        colorPickerTrigger.style.backgroundColor = polygonsData[polygonIndex].color;
        polygonColorPicker.on("done", color => {
            polygonsData[polygonIndex].color = color.css();
            polygon.fill(polygonsData[polygonIndex].color);
            polygon.opacity(.5);
            colorCode.innerText = polygonsData[polygonIndex].color;
            colorPickerTrigger.style.backgroundColor = polygonsData[polygonIndex].color;
            polygonColorPickerWrapper.classList.add('hide');
            drawingLayer.draw();
        });
    };

    // Create input for transparency for a polygon
    const createToolbarTransparency = (polygon, polygonIndex) => {
        const polygonToolbarTransparency = document.getElementById('polygonToolbarTransparency');
        while(polygonToolbarTransparency.firstChild) {
            polygonToolbarTransparency.removeChild(polygonToolbarTransparency.lastChild);
        }
        const transparencyInput = document.createElement('input');
        const transparencyInputLabel = document.createElement('label');
        transparencyInput.setAttribute('type', 'range');
        transparencyInput.setAttribute('max', '1');
        transparencyInput.setAttribute('step', '.1');
        transparencyInputLabel.innerText = 'Transparencia';
        polygonToolbarTransparency.appendChild(transparencyInputLabel);
        polygonToolbarTransparency.appendChild(transparencyInput);
        transparencyInput.value = polygon.opacity().toString();
        transparencyInput.addEventListener('change', (e) => {
            polygon.opacity(Number(transparencyInput.value));
            drawingLayer.draw();
            polygonsData[polygonIndex].transparency = Number(transparencyInput.value);
        });
    };

    // Create hover color picker for a polygon
    const createToolbarHoverColor = (polygon, polygonIndex) => {
        if(polygonHoverColorPickerWrapper.childNodes.length > 0) {
            polygonHoverColorPickerWrapper.removeChild(polygonHoverColorPickerWrapper.childNodes[0]);
        }
        const polygonHoverColorPickerElement = document.createElement('div');
        polygonHoverColorPickerElement.id = 'polygonHoverColorPicker';
        polygonHoverColorPickerElement.classList.add('colorPicker');
        polygonHoverColorPickerWrapper.appendChild(polygonHoverColorPickerElement);
        const polygonHoverColorPicker = colorjoe.rgb('polygonHoverColorPicker', polygonsData[polygonIndex] ? polygonsData[polygonIndex].hoverColor : 'red');
        const hoverColorCode = document.getElementById('hoverColorCode');
        hoverColorCode.innerText = polygonsData[polygonIndex] ? polygonsData[polygonIndex].hoverColor : 'red';
        hoverColorPickerTrigger.style.backgroundColor = polygonsData[polygonIndex] ? polygonsData[polygonIndex].hoverColor : 'red';
        polygonHoverColorPicker.on("done", color => {
            polygonsData[polygonIndex].hoverColor = color.css();
            hoverColorCode.innerText = polygonsData[polygonIndex].hoverColor;
            hoverColorPickerTrigger.style.backgroundColor = polygonsData[polygonIndex].hoverColor;
            polygonHoverColorPickerWrapper.classList.add('hide');
        });
    };

    const createToolbarHoverText = (polygon, polygonIndex) => {
        const polygonToolbarHoverText = document.getElementById('polygonToolbarHoverText');
        while(polygonToolbarHoverText.firstChild) {
            polygonToolbarHoverText.removeChild(polygonToolbarHoverText.lastChild);
        }
        const hoverTextInput = document.createElement('input');
        const hoverTextLabel = document.createElement('label');
        hoverTextLabel.innerText = 'Texto Hover';
        hoverTextLabel.setAttribute('for', 'hoverText');
        hoverTextInput.setAttribute('type', 'text');
        hoverTextInput.setAttribute('name', 'hoverText');
        hoverTextInput.value = polygonsData[polygonIndex] ? polygonsData[polygonIndex].hoverText : '';
        polygonToolbarHoverText.appendChild(hoverTextLabel);
        polygonToolbarHoverText.appendChild(hoverTextInput);
        hoverTextInput.addEventListener('change', (e) => {
            polygonsData[polygonIndex].hoverText = hoverTextInput.value;
        });
    };

    // toggle barra de contenido en toolbar de poligono
    const toolbarContenidoTrigger = document.getElementById('toolbarContenidoTrigger');
    const toolbarContenidoWrapper = document.getElementById('toolbarContenidoWrapper');
    toolbarContenidoTrigger.addEventListener('click', (e) => {
        const expandIcon = document.getElementById('expandIcon');
        if(toolbarContenidoWrapper.classList.contains('hide')) {
            toolbarContenidoWrapper.classList.remove('hide');
            expandIcon.innerHTML = 'expand_less';
        } else {
            toolbarContenidoWrapper.classList.add('hide');
            expandIcon.innerHTML = 'expand_more';
        }
    });

    // crear barra de contenido
    const createToolbarContent = (polygon, polygonIndex) => {
        toolbarContenidoWrapper.innerHTML = '';

        // Fotos
        const fotosTitle = document.createElement('p');
        fotosTitle.innerText = 'Fotos';
        const dropArea = document.createElement('div');
        dropArea.id = 'dropArea';
        const fotosInputEl = document.createElement('input');
        const fotosInputLabel = document.createElement('label');
        fotosInputEl.setAttribute('id', 'fotosInput');
        fotosInputEl.setAttribute('type', 'file');
        fotosInputEl.setAttribute('multiple', '');
        fotosInputEl.setAttribute('accept', 'image/*');
        fotosInputLabel.setAttribute('for', 'fotosInput');
        dropArea.appendChild(fotosInputEl);
        dropArea.appendChild(fotosInputLabel);
        toolbarContenidoWrapper.appendChild(fotosTitle);
        toolbarContenidoWrapper.appendChild(dropArea);
        if(polygonsData[polygonIndex] && polygonsData[polygonIndex].content.fotos) {
            fotosInputEl.files = polygonsData[polygonIndex].content.fotos;
        }
        fotosInputEl.addEventListener('change', (e) => {
            polygonsData[polygonIndex].content.fotos = fotosInputEl.files;
        });


        // Datos
        const textEditorDatosTitle = document.createElement('p');
        textEditorDatosTitle.innerText = 'Datos';
        const textEditorDatos = document.createElement('div');
        textEditorDatos.id = 'textEditorDatos';
        toolbarContenidoWrapper.appendChild(textEditorDatosTitle);
        toolbarContenidoWrapper.appendChild(textEditorDatos);
        const quillDatos = new Quill('#textEditorDatos', {
            modules: {
                toolbar: [
                    [{ header: [1, 2, false] }],
                    ['bold', 'italic', 'underline']
                ]
            },
            theme: 'snow'
        });
        if(polygonsData[polygonIndex] && polygonsData[polygonIndex].content.datos) {
            quillDatos.setContents(polygonsData[polygonIndex].content.datos);
        }
        quillDatos.on('text-change', (e) => {
            polygonsData[polygonIndex].content.datos = quillDatos.getContents();
        });

        // TODO se puede hacer refactor con una funcion generica para recorrido y video ...
        // Link Recorrido 360
        const toolbarItemLink360 = document.createElement('div');
        toolbarItemLink360.classList.add('toolbar-item');
        const link360Title = document.createElement('label');
        link360Title.innerText = 'Link a Recorrido 360';
        link360Title.setAttribute('for', 'link360Input');
        const link360InputEl = document.createElement('input');
        link360InputEl.setAttribute('type', 'text');
        link360InputEl.setAttribute('name', 'link360Input');
        link360InputEl.id = 'link360Input';
        link360InputEl.value = polygonsData[polygonIndex] ? polygonsData[polygonIndex].content.linkRecorrido360 : '';
        toolbarItemLink360.appendChild(link360Title);
        toolbarItemLink360.appendChild(link360InputEl);
        link360InputEl.addEventListener('change', (e) => {
            polygonsData[polygonIndex].content.linkRecorrido360 = link360InputEl.value;
        });
        toolbarContenidoWrapper.appendChild(toolbarItemLink360);

        // Link video
        const toolbarItemVideo = document.createElement('div');
        toolbarItemVideo.classList.add('toolbar-item');
        const videoTitle = document.createElement('label');
        videoTitle.innerText = 'Link a Video';
        videoTitle.setAttribute('for', 'videoInput');
        const videoInputEl = document.createElement('input');
        videoInputEl.setAttribute('type', 'text');
        videoInputEl.setAttribute('name', 'videoInput');
        videoInputEl.id = 'videoInput';
        videoInputEl.value = polygonsData[polygonIndex] ? polygonsData[polygonIndex].content.linkVideo : '';
        toolbarItemVideo.appendChild(videoTitle);
        toolbarItemVideo.appendChild(videoInputEl);
        videoInputEl.addEventListener('change', (e) => {
            polygonsData[polygonIndex].content.linkVideo = videoInputEl.value;
        });
        toolbarContenidoWrapper.appendChild(toolbarItemVideo);

        // Contacto
        const textEditorContactoTitle = document.createElement('p');
        textEditorContactoTitle.innerText = 'Contacto';
        const textEditorContacto = document.createElement('div');
        textEditorContacto.id = 'textEditorContacto';
        toolbarContenidoWrapper.appendChild(textEditorContactoTitle);
        toolbarContenidoWrapper.appendChild(textEditorContacto);
        const quillContacto = new Quill('#textEditorContacto', {
            modules: {
                toolbar: [
                    [{ header: [1, 2, false] }],
                    ['bold', 'italic', 'underline']
                ]
            },
            theme: 'snow'
        });
        if(polygonsData[polygonIndex] && polygonsData[polygonIndex].content.contacto) {
            quillContacto.setContents(polygonsData[polygonIndex].content.contacto);
        }
        quillContacto.on('text-change', (e) => {
            polygonsData[polygonIndex].content.contacto = quillContacto.getContents();
        });
    };


    // Selecting a polygon
    const selecting = () => {
        const polygons = drawingLayer.getChildren((node) => {return node.getClassName() === 'Line'});
        polygons.each( (polygon, n) => {
            if(mode === 'select') {
                const polygonIndex = polygonsData.findIndex((polygonData) => polygonData.id === polygon._id);
                polygon.on('mousedown', (e) => {
                    polygons.each((polygon, n) => polygon.stroke('black'));
                    selectedPolygon = polygon;
                    polygon.stroke('red');
                    btnDelete.disabled = false;
                    deletePolygon = true;
                    polygonSelectedToolbar.classList.remove('hide');
                    const toolbarTitle = document.getElementById('polygonSelectedToolbarTitle');
                    toolbarTitle.innerText = `Polígono ${polygon._id}`;
                    // Color
                    createToolbarColor(polygon, polygonIndex);
                    // Transparency
                    createToolbarTransparency(polygon, polygonIndex);
                    // Hover color
                    createToolbarHoverColor(polygon, polygonIndex);
                    // Hover Text
                    createToolbarHoverText(polygon, polygonIndex);
                    // Contenido
                    createToolbarContent(polygon, polygonIndex);
                });
                // polygon.on('dragend', (e) => {
                //     polygonsData[polygonIndex].position = [polygon.getSelfRect().x + polygon.x(), polygon.getSelfRect().y + polygon.y()];
                // })
            }
        });
    };

    const quitSelecting = () => {
        const polygons = drawingLayer.getChildren((node) => {return node.getClassName() === 'Line'});
        polygons.each((polygon, n) => polygon.stroke('black'));
        polygonSelectedToolbar.classList.add('hide');
        selectedPolygon = null;
    };

    drawingLayer.on('mousemove', (e) => {
        if(drawingInProgress) {
            guide.points([...lastClickCoords, e.evt.layerX, e.evt.layerY]);
            guideLayer.add(guide);
            stage.add(guideLayer);
            guideLayer.draw();
        }
    });

    drawingLayer.on('click', (e) => {
        if(mode === 'draw' && !drawingInProgress) {
            drawingInProgress = true;
            lastClickCoords = [e.evt.layerX, e.evt.layerY];
            polygonInProgress = lastClickCoords;
        }
        if(mode === 'draw' && drawingInProgress) {
            let line = new Konva.Line({
                points: [...lastClickCoords, e.evt.layerX, e.evt.layerY],
                stroke: 'black',
                strokeWidth: 1
            });
            polygonInProgressLayer.add(line);
            polygonInProgressLayer.draw();
            lastClickCoords = [e.evt.layerX, e.evt.layerY];
            polygonInProgress = [...polygonInProgress, ...lastClickCoords];
        }
    });




    let transformer = new Konva.Transformer({
        ignoreStroke: true
    });
    drawingLayer.add(transformer);

    drawingLayer.on('contextmenu', (e) => {
        e.evt.preventDefault();
        // Termina de dibujar
        if(mode === 'draw' && drawingInProgress) {
            guideLayer.clear();
            polygonInProgressLayer.clear();
            polygonInProgressLayer.destroyChildren();
            drawingInProgress = false;
            polygonInProgress.splice(-2, 2);
            if(polygonInProgress.length > 7) {
                let polygon = new Konva.Line({
                    points: polygonInProgress,
                    fill: 'rgb(25,118,210)',
                    stroke: '#000000',
                    strokeWidth: 1,
                    closed: true,
                    draggable: true,
                    opacity: .5
                });
                const newPolygonData = {
                    id: polygon._id,
                    color: polygon.fill(),
                    points: polygon.points(),
                    transform: null,
                    transparency: polygon.opacity(),
                    position: [polygon.getSelfRect().x, polygon.getSelfRect().y],
                    hoverColor: polygon.fill(),
                    hoverText: '',
                    content: {
                        fotos: null,
                        datos: null,
                        linkRecorrido360: '',
                        linkVideo: '',
                        contacto: null
                    }
                };
                polygonsData.push(newPolygonData);
                polygon.on('click', (e) => {
                    if(mode === 'resize' && transformer.nodes().includes(polygon) === false) {
                        editPolygon(polygon);
                    }
                });
                polygon.on('mouseover', (e) => {
                    const polygonIndex = polygonsData.findIndex(polygonData => polygonData.id === polygon._id);
                    polygon.fill(polygonsData[polygonIndex].hoverColor);
                    drawingLayer.draw();
                });
                polygon.on('mouseout', (e) => {
                    const polygonIndex = polygonsData.findIndex(polygonData => polygonData.id === polygon._id);
                    polygon.fill(polygonsData[polygonIndex].color);
                    drawingLayer.draw();
                });
                drawingLayer.add(polygon);
                drawingLayer.draw();
            }
            polygonInProgress = [];
            // console.log(drawingLayer.getChildren((node) => {
            //     return node.getClassName() === 'Line';
            // }).toArray());
        }
    });

    // TODO position of nodes can be determined when pressing finish, so we get the latest transformation values relative to initial ones, when node was created
    // TODO this includes position, rotation, scaling

    const editPolygon = (polygon) => {
        transformer.nodes([polygon]);
        deletePolygon = true;
        btnDelete.disabled = false;
        drawingLayer.draw();
    };
    const stopEditPolygon = () => {
        transformer.nodes([]);
        deletePolygon = false;
        btnDelete.disabled = true;
        drawingLayer.draw();
    };


    // Cursor styling
    stage.on('mousemove', e => {
        if(mode === 'draw') {
            stage.container().style.cursor = 'crosshair';
        }
        else {
            stage.container().style.cursor = 'default';
        }
    });
    stage.on('mouseleave', e => {
        stage.container().style.cursor = 'default';
    });



    const getPolygonsOnScreen = () => {
        let currentPolygons = drawingLayer.getChildren(node => {
            return node.getClassName() === 'Line';
        });
        // console.log(drawingLayer.getChildren((node) => {
        //     return node.getClassName() === 'Line';
        // }).toArray());
        return currentPolygons.toArray();
    };

    // SECOND SCREEN LOGIC

    const drawingScreen = document.getElementById('drawingScreen');
    const secondScreen = document.getElementById('secondScreen');

    const btnBackToDrawingScreen = document.getElementById('btnBackToDrawingScreen');

    const btnFinalizar = document.getElementById('btnFinalizar');

   // Click en Finalizar
    btnFinalizar.addEventListener('click', e => {
        console.log(getPolygonsData(getPolygonsOnScreen()))

        // Crea la segunda pantalla
        // if(getPolygonsOnScreen().length > 0 && imageObj.getAttribute('src') !== null) {
        //     drawingScreen.classList.add('hide');
        //     secondScreen.classList.remove('hide');
        //     createSecondStage();
        //     currentScreen = 'viewing';
        // } else {
        //     window.alert('Debe cargar una imagen de fondo y al menos un polígono para continuar.');
        // }
    });

    btnBackToDrawingScreen.addEventListener('click', e => {
        drawingScreen.classList.remove('hide');
        secondScreen.classList.add('hide');
    });
    let secondStage = new Konva.Stage({
        container: 'canvasContainer2',
        width: 500,
        height: 500,
    });
    let imagenSecondStage = new Konva.Image({
        x: 0,
        y: 0,
        image: null
    });
    let mainLayer = new Konva.Layer();
    secondStage.add(mainLayer);

    const createSecondStage = () => {
        mainLayer.removeChildren();
        imagenSecondStage.image(imageObj);
        imagenSecondStage.opacity(edificio.opacity());
        secondStage.width(imagenSecondStage.width());
        secondStage.height(imagenSecondStage.height());
        mainLayer.add(imagenSecondStage);
        mainLayer.batchDraw();
        fitStageIntoParentContainer();

        const infoCard = document.getElementById('infoCard');

        getPolygonsOnScreen().forEach((polygon, i) => {
            let poly = new Konva.Line({
                points: polygon.points(),
                fill: 'rgba(0,131,143, .4)',
                strokeEnabled: false,
                offsetX: polygon.offsetX(),
                offsetY: polygon.offsetY(),
                rotation: polygon.rotation(),
                scaleX: polygon.scaleX(),
                scaleY: polygon.scaleY(),
                skewX: polygon.skewX(),
                skewY: polygon.skewY(),
                x: polygon.x(),
                y: polygon.y(),
                closed: true,
            });
            mainLayer.add(poly);
            poly.on('mouseover', e => {
                poly.fill('rgba(85,139,47,.5)');
                mainLayer.draw();
                secondStage.container().style.cursor = 'pointer';
                infoCard.innerHTML = `<div class="title">Unidad ${i+1}</div>
                    <div class="text">Disponible.</div>`
            });

            poly.on('mouseout', e => {
                poly.fill('rgba(0,131,143, .4)');
                mainLayer.draw();
                secondStage.container().style.cursor = 'default';
                infoCard.innerHTML = `<div class="title">Unidades</div>
                    <div class="text">Seleccione una unidad para ver más información aquí.</div>`
            });
            poly.on('click', e => {
                if(modalWrapper.classList.contains('hide')) {
                    modalWrapper.classList.remove('hide');
                    new Splide( '.splide' ).mount();
                    startTabs();
                }
            })
        });
        mainLayer.draw();
    };

    window.addEventListener('resize', () => {if (currentScreen === 'viewing') createSecondStage()});
}






// RESPONSIVE CANVAS
const fitStageIntoParentContainer = () => {
    const container = document.getElementById('secondScreenWrapper');
    const containerWidth = container.offsetWidth;
    const scale = containerWidth / secondStage.width();

    secondStage.width(secondStage.width() * scale);
    secondStage.height(secondStage.height() * scale);
    secondStage.scale({ x: scale, y: scale });
    secondStage.draw();
};





// MODAL
const modalWrapper = document.getElementById('modalWrapper');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalOverlay = document.getElementById('modalOverlay');


closeModalBtn.addEventListener('click', e => {
    modalWrapper.classList.add('hide');
});
modalOverlay.addEventListener('click', e => {
    modalWrapper.classList.add('hide');
});




if(demo) {
    const secondScreen = document.getElementById('secondScreen');
    let mainLayer = new Konva.Layer();
    secondStage.add(mainLayer);
    const createDemoScreen = () => {
        let testImageObj = new Image();
        let testImage = new Konva.Image({
            x: 0,
            y: 0,
            image: null
        });
        testImageObj.onload = function () {
            testImage.image(testImageObj);
            secondStage.width(testImage.width());
            secondStage.height(testImage.height());
            mainLayer.add(testImage);
            mainLayer.batchDraw();
            createTestPolygons();
            fitStageIntoParentContainer();
        };
        testImageObj.src = '../edificio1.jpg';
        //drawingScreen.classList.add('hide');
        secondScreen.classList.remove('hide');
    };

    const createTestPolygons = () => {
        let polygon1 = new Konva.Line({
            points: [446, 64, 446, 64, 600, 144, 600, 238, 444, 170],
            fill: 'rgba(0,131,143, .4)',
            strokeEnabled: false,
            strokeWidth: 1,
            closed: true,
            draggable: false
        });
        let polygon2 = new Konva.Line({
            points: [721, 114, 721, 114, 815, 175, 814, 667, 715, 669],
            fill: 'rgba(0,131,143, .4)',
            strokeEnabled: false,
            strokeWidth: 1,
            closed: true,
            draggable: false
        });
        let polygon3 = new Konva.Line({
            points: [886, 148, 886, 148, 887, 290, 817, 255, 818, 336, 948, 393, 947, 195],
            fill: 'rgba(0,131,143, .4)',
            strokeEnabled: false,
            strokeWidth: 1,
            closed: true,
            draggable: false
        });
        const polygons = [polygon1, polygon2, polygon3];
        const infoCard = document.getElementById('infoCard');
        const modalWrapper = document.getElementById('modalWrapper');

        polygons.forEach((polygon, i) => {
            mainLayer.add(polygon);
            polygon.on('mouseover', e => {
                polygon.fill('rgba(85,139,47,.5)');
                mainLayer.draw();
                secondStage.container().style.cursor = 'pointer';
                infoCard.innerHTML = `<div class="title">Unidad ${i+1}</div>
                    <div class="text">Disponible.</div>`
            });
            polygon.on('mouseout', e => {
                polygon.fill('rgba(0,131,143, .4)');
                mainLayer.draw();
                secondStage.container().style.cursor = 'default';
                infoCard.innerHTML = `<div class="title">Unidades</div>
                    <div class="text">Seleccione una unidad para ver más información aquí.</div>`
            });
            polygon.on('click', e => {
                if(modalWrapper.classList.contains('hide')) {
                    modalWrapper.classList.remove('hide')
                    new Splide( '.splide' ).mount();
                    startTabs();
                }
            })
        });
        mainLayer.draw();
    };


    createDemoScreen();

    window.addEventListener('resize', () => {createDemoScreen()});
}
const getPolygonsData = (polygonsOnScreen) => {
    if(polygonsData.length > 0) {
        polygonsData.forEach(polygonData => {
            const index = polygonsOnScreen.findIndex(polygonOnScreen => polygonOnScreen._id === polygonData.id);
            polygonData.transform = polygonsOnScreen[index].getTransform().decompose()
        });
    }
    return polygonsData
};
export {getPolygonsData};
