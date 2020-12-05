import api from "./api";
import { CovidCountrySummary } from "./data/summary";

export interface SidebarContent {
    render(): string;
    onMount(elem: HTMLDivElement): void;
}

export class CountrySidebarContent implements SidebarContent {
    constructor(summary: CovidCountrySummary) {
        this.summary = summary;
    }

    public async onMount(elem: HTMLDivElement) {
        this.canvas = elem.querySelector('#sidebar-canvas')! as HTMLCanvasElement;
        const ctx = this.canvas.getContext('2d')!;  

        let total = true;
        let month = false;

        let totalSelector = elem.querySelector('#sidebar-total-selector') as HTMLAnchorElement;
        let liveSelector = elem.querySelector('#sidebar-live-selector') as HTMLAnchorElement;
        let weekSelector = elem.querySelector('#sidebar-week-selector') as HTMLAnchorElement;
        let monthSelector = elem.querySelector('#sidebar-month-selector') as HTMLAnchorElement;

        totalSelector.classList.add('selected');
        weekSelector.classList.add('selected');

        const chart = new Chart(ctx, {
            type: 'line',
        });

        const update = () => {
            if (total) {
                this.onShowTotalChart(chart, month);
            } else {
                this.onShowLivechart(chart, month);
            }
        };

        totalSelector.addEventListener('click', () => {
            if (total)
                return;

            totalSelector.classList.add('selected');
            liveSelector.classList.remove('selected');

            total = true;

            update();
        });

        liveSelector.addEventListener('click', () => {
            if (!total)
                return;

            totalSelector.classList.remove('selected');
            liveSelector.classList.add('selected');

            total = false;

            update();
        });

        weekSelector.addEventListener('click', () => {
            if (!month)
                return;

            weekSelector.classList.add('selected');
            monthSelector.classList.remove('selected');

            month = false;

            update();
        });

        monthSelector.addEventListener('click', () => {
            if (month)
                return;

            weekSelector.classList.remove('selected');
            monthSelector.classList.add('selected');

            month = true;

            update();
        });

        update();
    }

    public render() {
        return `
            <h1>${this.summary.Country}</h1>
            As of: ${new Date(this.summary.Date).toLocaleString()}

            <br><br>

            <table style="width: 80%;">
                <tbody>
                    <tr>
                        <td>Live Cases: </td>
                        <td style="text-align: right;">${this.summary.TotalConfirmed - this.summary.TotalDeaths - this.summary.TotalRecovered}</td>
                    </tr>
                    <tr>
                        <td>Total Cases: </td>
                        <td style="text-align: right;">${this.summary.TotalConfirmed}</td>

                        <td>&nbsp;&nbsp;</td>

                        <td>New: </td>
                        <td style="text-align: right;">${this.summary.NewConfirmed}</td>
                    </tr>
                    <tr>
                        <td>Total Deaths:</td>
                        <td style="text-align: right;">${this.summary.TotalDeaths}</td>

                        <td>&nbsp;&nbsp;</td>

                        <td>New: </td>
                        <td style="text-align: right;">${this.summary.NewDeaths}</td>
                    </tr>
                    <tr>
                        <td>Total recoveries:</td>
                        <td style="text-align: right;">${this.summary.TotalRecovered}</td>

                        <td>&nbsp;&nbsp;</td>

                        <td>New: </td>
                        <td style="text-align: right;">${this.summary.NewRecovered}</td>
                    </tr>
                </tbody>
            </table>

            <h1>Covid timeline</h1>

            <div>
                <a href="#" id="sidebar-total-selector"> Total </a> &nbsp;
                <a href="#" id="sidebar-live-selector"> Live </a> &nbsp;
                | &nbsp;
                <a href="#" id="sidebar-week-selector"> Week </a> &nbsp;
                <a href="#" id="sidebar-month-selector"> Month </a>
            </div> <br>

            <canvas width="400" height="300" style="width: 400px; height: 300px;" id="sidebar-canvas"></canvas>
        `;
    }

    private subMonthsFromDate(date: Date, numMonths: number) {
        let newDate = new Date(date.getTime());
        const month = newDate.getMonth();
        newDate.setMonth(newDate.getMonth() - numMonths);

        if (((month - numMonths < 0) && (date.getMonth() != (month + numMonths))) ||
            ((month - numMonths >= 0) && (date.getMonth() != month - numMonths))
            ) {
            newDate.setDate(0);
        }

        return newDate;
    }

    private async onShowTotalChart(chart: Chart, month: boolean) {
        const to = new Date();
        to.setHours(0, 0, 0, 0);

        const from = new Date(to.getTime());

        if (month) {
            from.setTime(this.subMonthsFromDate(from, 1).getTime());
        } else {
            from.setDate(from.getDate() - 7); 
        }

        const result = await api.byCountry(this.summary.CountryCode, from, to);
        const labels = result.map((x) => month ? new Date(x.Date).getDate() + '.' + new Date(x.Date).getMonth() : new Date(x.Date).toLocaleString('en-us', {  weekday: 'long' }));

        const confirmedDataset = {
            label: 'Confirmed',
            data: result.map((x) => x.Confirmed),
            backgroundColor: '#FFFF0030'
        };

        const deathDataset = {
            label: 'Deaths',
            data: result.map((x) => x.Deaths),
            backgroundColor: '#FF000030'
        };

        const recoveredDataset = {
            label: 'Recovered',
            data: result.map((x) => x.Recovered),
            backgroundColor: '#00FF0030'
        };

        chart.data = {
            labels: labels,
            datasets: [
                confirmedDataset,
                deathDataset,
                recoveredDataset
            ]
        }

        chart.update();
    }

    private onShowLivechart(chart: Chart, month: boolean) {

    }

    private summary: CovidCountrySummary;
    private canvas?: HTMLCanvasElement;
}

export class SidebarController {
    constructor(sidebarElement: HTMLDivElement) {
        this.sidebarElement = sidebarElement;
        this.toggleElement = sidebarElement.querySelector('.sidebar-opener')! as HTMLDivElement;
        this.sidebarInner = sidebarElement.querySelector('.sidebar-content')! as HTMLDivElement;
        this.isOpen = false;

        this.toggleElement.addEventListener('click', this.toggle.bind(this));
    }

    public open() {
        if (this.isOpen)
            return;

        this.sidebarElement.classList.add('content-sidebar-container-open');
        this.sidebarElement.classList.remove('content-sidebar-container-closed');
        this.toggleElement.innerText = '>>';

        this.isOpen = true;
    }

    public close() {
        if (!this.isOpen)
            return;

        this.sidebarElement.classList.add('content-sidebar-container-closed');
        this.sidebarElement.classList.remove('content-sidebar-container-open');
        this.toggleElement.innerText = '<<';

        this.isOpen = false;
    }

    public toggle() {
        this.isOpen ?
            this.close() :
            this.open();
    }

    public setContent(content: SidebarContent) {
        this.sidebarInner.innerHTML = content.render();
        content.onMount(this.sidebarInner);
    }

    private sidebarElement: HTMLDivElement;
    private sidebarInner: HTMLDivElement;
    private toggleElement: HTMLDivElement;

    private isOpen: boolean;
}

const setupSidebar = (sidebar: HTMLDivElement) => {
    return new SidebarController(sidebar);
};

export default setupSidebar;