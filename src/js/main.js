import Konva from "konva";
import {startTooltips} from './tooltips'

startTooltips();

const STAGE_W = 500;
const STAGE_H = 500;
let mode = null;
let drawingInProgress = false;
let polygonInProgress = [];
let lastClickCoords = [];
let deletePolygon = false;

let stage = new Konva.Stage({
    container: 'canvasContainer',
    width: STAGE_W,
    height: STAGE_H
});
let imageLayer = new Konva.Layer();
let drawingLayer = new Konva.Layer();
let polygonInProgressLayer = new Konva.Layer();
let guideLayer = new Konva.Layer();

const drawingBoard = new Konva.Rect({
    x: 0,
    y: 0,
    width: STAGE_W,
    height: STAGE_H,
    fill: '#f1f1f1'
});

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
    let imageObj = new Image();
    imageObj.src = URL.createObjectURL(e.target.files[0]);
    imageObj.onload = function () {
        edificio.image(imageObj);
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

const imageOpacityInput = document.getElementById('imageOpacity');
imageOpacityInput.addEventListener('change', e => {
    const opacityValue =Number(e.target.value) / 10;
    edificio.opacity(opacityValue);
    imageLayer.draw();
});


const btnDraw = document.getElementById('btnDraw');
btnDraw.addEventListener('click', (e) => {
    changeMode('draw');
});

const btnResize = document.getElementById('btnResize');
btnResize.addEventListener('click', (e) => {
    changeMode('resize');
});

const changeMode = (modeValue) => {
    if(drawingInProgress) {
        guideLayer.clear();
        polygonInProgressLayer.clear();
        polygonInProgressLayer.destroyChildren();
        drawingInProgress = false;
    }
    mode = modeValue;
    switch(mode) {
        case 'draw':
            btnDraw.classList.add('active');
            btnResize.classList.remove('active');
            stopEditPolygon();
            break;
        case 'resize':
            btnResize.classList.add('active');
            btnDraw.classList.remove('active');
            break;
    }
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


// TODO do this with double click, remember it triggers single click too
drawingLayer.on('contextmenu', (e) => {
    e.evt.preventDefault();
    if(mode === 'draw' && drawingInProgress) {
        guideLayer.clear();
        polygonInProgressLayer.clear();
        polygonInProgressLayer.destroyChildren();
        drawingInProgress = false;
        polygonInProgress.splice(-2, 2);
        if(polygonInProgress.length > 7) {
            let polygon = new Konva.Line({
                points: polygonInProgress,
                fill: 'rgba(25,118,210, .3)',
                stroke: '#000000',
                strokeWidth: 1,
                closed: true,
                draggable: true
            });
            polygon.on('click', (e) => {
                if(mode === 'resize' && transformer.nodes().includes(polygon) === false) {
                    editPolygon(polygon);
                }
            });
            drawingLayer.add(polygon);
            drawingLayer.draw();
        }
        polygonInProgress = [];
    }
});

const editPolygon = (polygon) => {
    transformer.nodes([polygon]);
    drawingLayer.draw();
};
const stopEditPolygon = () => {
    transformer.nodes([]);
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
    return currentPolygons.toArray();
};
