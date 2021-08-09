export const startTabs = () => {
    const tabs = document.querySelectorAll('.tab');
    const tabsContent = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', e => {
            tabs.forEach(tab1 => {
                if(tab1.classList.contains('active')) {
                    tab1.classList.remove('active')
                }
            });
            tab.classList.add('active');
            const dataAttr = tab.dataset.tabName;
            tabsContent.forEach(tabContent => {
                if(tabContent.classList.contains('active')) {
                    tabContent.classList.remove('active')
                }
                if(tabContent.dataset.tabName === dataAttr) {
                    tabContent.classList.add('active')
                }
            })
        })
    });
}
