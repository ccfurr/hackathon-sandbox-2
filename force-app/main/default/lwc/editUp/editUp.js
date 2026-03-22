import { LightningElement } from 'lwc';
import ModalManage from 'c/modalManage';

export default class EditUp extends LightningElement {
    latestQueryName = '';

    // getting latest query from localstorage to dispaly on page
    connectedCallback() {
        this.latestQueryName = localStorage.getItem('latestQueryName') || '';
    }

    // waiting for case user open the card -> open modal
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