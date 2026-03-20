const appData = [
    {
        category: "App Dùng Chung",
        icon: "ph ph-globe",
        apps: [
            { id: 'creative', name: 'Creative Hub', desc: 'Centralized creative assets and tools.', icon: 'ph ph-palette', url: 'creative.html' },
            { id: 'ui-gen', name: 'UI Generator', desc: 'Automated UI component generation.', icon: 'ph ph-code', url: '#' },
            { id: 'docs', name: 'Documentation', desc: 'Company-wide documentation and wiki.', icon: 'ph ph-book-open-text', url: '#' }
        ]
    },
    {
        category: "App Theo Dự Án",
        icon: "ph-fill ph-folder-star",
        apps: [
            { id: 'project-a', name: 'Project Alpha', desc: 'Dashboard for Alpha project tracking.', icon: 'ph ph-rocket-launch', url: '#' },
            { id: 'project-b', name: 'Project Beta', desc: 'Metrics and logs for Beta project.', icon: 'ph ph-chart-line-up', url: '#' },
            { id: 'crm', name: 'Mini CRM', desc: 'Customer relationship tracking tool.', icon: 'ph ph-users', url: '#' },
            { id: 'analytics', name: 'Data Viz', desc: 'Cloud visual analytics platform.', icon: 'ph ph-chart-pie-slice', url: '#' }
        ]
    },
    {
        category: "App Khác",
        icon: "ph-fill ph-dots-three-circle",
        apps: [
            { id: 'settings', name: 'Account Settings', desc: 'Manage your profile and preferences.', icon: 'ph ph-gear-six', url: '#' },
            { id: 'support', name: 'IT Helpdesk', desc: 'Submit tickets and request support.', icon: 'ph ph-lifebuoy', url: '#' }
        ]
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('app-container');
    let totalApps = 0;

    appData.forEach(section => {
        totalApps += section.apps.length;

        // Create Section Element
        const sectionEl = document.createElement('div');
        sectionEl.className = 'category-section';

        // Create Section Header
        const headerEl = document.createElement('div');
        headerEl.className = 'category-header';
        headerEl.innerHTML = `
            <div class="category-title">
                <i class="${section.icon}"></i>
                ${section.category}
            </div>
            <div class="category-line"></div>
            <div class="category-count">${section.apps.length} APPS</div>
        `;

        // Create App Grid
        const gridEl = document.createElement('div');
        gridEl.className = 'app-grid';

        // Populate Cards
        section.apps.forEach(app => {
            const cardEl = document.createElement('a');
            cardEl.href = app.url;
            cardEl.className = 'app-card';
            cardEl.innerHTML = `
                <div class="card-icon-container">
                    <i class="${app.icon}"></i>
                </div>
                <div class="card-content">
                    <span class="card-title">${app.name}</span>
                    <span class="card-desc">${app.desc}</span>
                </div>
                <i class="ph ph-arrow-up-right card-arrow"></i>
            `;
            gridEl.appendChild(cardEl);
        });

        sectionEl.appendChild(headerEl);
        sectionEl.appendChild(gridEl);
        container.appendChild(sectionEl);
    });

    // Update total count
    document.getElementById('total-apps').textContent = totalApps;
});
