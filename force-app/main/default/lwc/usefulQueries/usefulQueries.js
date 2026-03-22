import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { deleteRecord } from 'lightning/uiRecordApi';
import getAllUsefulQueries from '@salesforce/apex/Casey_Apex_Class.getAllUsefulQueries';
import ModalManage from 'c/modalManage';

export default class UsefulQueries extends LightningElement {
    searchKey = '';
    selectedQuery = null;
    queries = [];
    filteredQueries = [];
    wiredQueriesResult;

    refreshHandler = async () => {
        await refreshApex(this.wiredQueriesResult);
    };

    async handleOpenManageModal() {
        const result = await ModalManage.open({
            size: 'large'
        });

        if (result && result.refresh) {
            await refreshApex(this.wiredQueriesResult);
        }
    }

    @wire(getAllUsefulQueries)
    wiredQueries(result) {
        this.wiredQueriesResult = result;
        const { data, error } = result;

        if (data) {
            this.queries = data.map(record => ({
                id: record.Id,
                name: record.Name || '',
                objectName: record.SObject_API_Name__c || '',
                description: record.Description__c || '',
                soql: record.SOQL__c || ''
            }));

            this.filteredQueries = [...this.queries];

            if (this.selectedQuery) {
                this.selectedQuery =
                    this.queries.find(query => query.id === this.selectedQuery.id) || null;
            }
        } else if (error) {
            console.error('WIRE ERROR:', error);
            this.showToast(
                'Error Loading Queries',
                'Unable to load useful queries from Salesforce.',
                'error',
                true
            );
        }
    }

    connectedCallback() {
        this.showToast(
            'Welcome to QueryVault',
            'Browse, search, view, copy, and delete useful queries from the library.',
            'info'
        );

        window.addEventListener('queriesupdated', this.refreshHandler);
    }

    disconnectedCallback() {
        window.removeEventListener('queriesupdated', this.refreshHandler);
    }

    get hasQueries() {
        return this.filteredQueries && this.filteredQueries.length > 0;
    }

    async handleManageQueries() {
        const result = await ModalManage.open({
            size: 'large'
        });

        if (result && result.refresh) {
            await refreshApex(this.wiredQueriesResult);

            this.showToast(
                'Updated',
                'Query list refreshed successfully.',
                'success'
            );
        }
    }

    handleSearchChange(event) {
        this.searchKey = (event.target.value || '').toLowerCase();

        this.filteredQueries = this.queries.filter(query =>
            (query.name || '').toLowerCase().includes(this.searchKey) ||
            (query.objectName || '').toLowerCase().includes(this.searchKey) ||
            (query.description || '').toLowerCase().includes(this.searchKey) ||
            (query.soql || '').toLowerCase().includes(this.searchKey)
        );
    }

    handleSelectQuery(event) {
        const selectedId = event.target.dataset.id;
        this.selectedQuery = this.queries.find(query => query.id === selectedId) || null;
    }

    async handleDelete(event) {
        const selectedId = event.target.dataset.id;

        const confirmed = window.confirm('Are you sure you want to delete this query?');
        if (!confirmed) {
            return;
        }

        try {
            await deleteRecord(selectedId);

            if (this.selectedQuery && this.selectedQuery.id === selectedId) {
                this.selectedQuery = null;
            }

            await refreshApex(this.wiredQueriesResult);

            this.showToast(
                'Query Deleted',
                'The useful query was removed successfully.',
                'success'
            );
        } catch (error) {
            console.error('DELETE ERROR:', error);
            this.showToast(
                'Delete Failed',
                'Unable to delete the selected useful query.',
                'error',
                true
            );
        }
    }

    handleCopySoql() {
        if (!this.selectedQuery || !this.selectedQuery.soql) {
            this.showToast(
                'Nothing to Copy',
                'No SOQL query is currently selected.',
                'warning'
            );
            return;
        }

        navigator.clipboard.writeText(this.selectedQuery.soql)
            .then(() => {
                this.showToast('Copied', 'SOQL copied to clipboard.', 'success');
            })
            .catch(error => {
                console.error('COPY ERROR:', error);
                this.showToast('Copy Failed', 'Unable to copy SOQL.', 'error');
            });
    }

    showToast(title, message, variant, isPersistent = false) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant,
                mode: isPersistent ? 'sticky' : 'dismissible'
            })
        );
    }
}