const tooltips = Array.from(document.querySelectorAll('.tooltip-trigger'));

export const startTooltips = () => {
    tooltips.forEach(el => {
        const tooltipWrapper = el.parentElement;
        const tooltip = tooltipWrapper.querySelector('.tooltip');
        el.addEventListener('mouseover', e => {
            tooltip.classList.remove('hide');
        });
        el.addEventListener('mouseout', e => {
            tooltip.classList.add('hide');
        });
    })
};
