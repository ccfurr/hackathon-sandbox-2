import { LightningElement } from 'lwc';
import ModalManage from 'c/modalManage';

export default class EditUp extends LightningElement {
    latestQueryName = '';

    connectedCallback() {
        this.latestQueryName = localStorage.getItem('latestQueryName') || '';
    }

    async openModal() {
        const result = await ModalManage.open({
            size: 'medium',
            description: 'Manage queries'
        });

        this.latestQueryName = localStorage.getItem('latestQueryName') || '';

        if (result && result.refresh) {
            window.dispatchEvent(new CustomEvent('queriesupdated'));
        }
    }
}