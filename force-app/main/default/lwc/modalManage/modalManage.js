import LightningModal from 'lightning/modal';
import { wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getUniqueObjectNames from '@salesforce/apex/Casey_Apex_Class.getEverything';
import getUsefulQueries from '@salesforce/apex/Casey_Apex_Class.getUsefulQueries';
import createUsefulQuery from '@salesforce/apex/Casey_Apex_Class.createUsefulQuery';
import updateUsefulQuery from '@salesforce/apex/Casey_Apex_Class.updateUsefulQuery';
import validateSOQL from '@salesforce/apex/Casey_Apex_Class.validateSOQL';

export default class ModalManage extends LightningModal {
    sobjectOptions = [];

    allQueries = [];
    filteredQueries = [];
    wiredQueriesResult;

    // create initializers
    createName = '';
    createDescription = '';
    createSObject = '';
    createSoql = '';

    // edit initializers
    editName = '';
    editDescription = '';
    editSObject = '';
    editSoql = '';

    // validation flags
    selectedQueryId = null;
    hasChanges = false;

    // load object names from @Casey_Apex_Class.cls
    @wire(getUniqueObjectNames)
    wiredObjects({ error, data }) {
        if (data) {
            this.sobjectOptions = data.map(item => ({
                label: item.Name_Field__c,
                value: item.Name_Field__c
            }));
        } else if (error) {
            console.error('Error loading object names:', error);
        }
    }

    // Load Queries including their data from @Casey_Apex_Class.cls
    @wire(getUsefulQueries)
    wiredQueries(result) {
        this.wiredQueriesResult = result;
        const { error, data } = result;

        if (data) {
            this.allQueries = data.map(record => ({
                id: record.Id,
                name: record.Name,
                description: record.Description__c || '',
                sobject: record.Name_Field__c || '',
                soql: record.SOQL__c || ''
            }));

            this.filteredQueries = [...this.allQueries];
        } else if (error) {
            console.error('Error loading useful queries:', error);
        }
    }

    // dynamically decide if current query is selected query to know if it should be highlighted
    get queries() {
        return this.filteredQueries.map(query => ({
            ...query,
            className: query.id === this.selectedQueryId ? 'queryItem selectedQuery' : 'queryItem'
        }));
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    // updated flag
    notifyQueriesUpdated() {
        window.dispatchEvent(new CustomEvent('queriesupdated'));
    }

    // pull in all the trimmed entries and make sure they are not empty.
    validateFields(name, description, sObject, soql) {
        if (!name.trim() || !description.trim() || !sObject.trim() || !soql.trim()) {
            this.showToast('Error', 'All fields must contain at least one non-space character.', 'error');
            return false;
        }

        return true;
    }

    // making sure we cant input duplicate names
    isDuplicateName(name, currentId = null) {
        const normalized = name.trim().toLowerCase();

        return this.allQueries.some(q =>
            q.name.trim().toLowerCase() === normalized &&
            q.id !== currentId
        );
    }

    // all these below are just handlers
    handleCreateNameInput(event) {
        this.createName = event.target.value;
    }

    handleCreateDescriptionInput(event) {
        this.createDescription = event.target.value;
    }

    handleCreateSObjectChange(event) {
        this.createSObject = event.target.value;
    }

    handleCreateSoqlInput(event) {
        this.createSoql = event.target.value;
    }

    handleEditNameInput(event) {
        this.editName = event.target.value;
        const search = this.editName.trim().toLowerCase();

        if (!search) {
            this.filteredQueries = [...this.allQueries];
            return;
        }

        this.filteredQueries = this.allQueries.filter(query =>
            query.name.toLowerCase().includes(search)
        );
    }
    
    // handling click event on the list of queries for edit
    handleQueryClick(event) {
        const queryId = event.currentTarget.dataset.id;
        const selected = this.allQueries.find(query => query.id === queryId);

        if (selected) {
            this.selectedQueryId = selected.id;
            this.editName = selected.name;
            this.editDescription = selected.description;
            this.editSObject = selected.sobject;
            this.editSoql = selected.soql;
        }
    }

    // below are handling edit input fields
    handleEditDescriptionInput(event) {
        this.editDescription = event.target.value;
    }

    handleEditSObjectChange(event) {
        this.editSObject = event.target.value;
    }

    handleEditSoqlInput(event) {
        this.editSoql = event.target.value;
    }

    // trimming values/calling to create @Casey_Apex_Class.cls
    async handleCreateQuery() {
        const name = this.createName.trim();
        const description = this.createDescription.trim();
        const sObjectName = this.createSObject.trim();
        const soqlText = this.createSoql.trim();
        const isValid = await validateSOQL({ soqlText });

        if (!this.validateFields(name, description, sObjectName, soqlText)) {
            return;
        }

        if (this.isDuplicateName(name)) {
            this.showToast('Error', 'A query with this name already exists.', 'error');
            return;
        }

        if (!isValid) {
            this.showToast('Error', 'Invalid SOQL query.', 'error');
            return;
        }

        try {
            const newId = await createUsefulQuery({
                name,
                description,
                sObjectName,
                soqlText
            });

            await refreshApex(this.wiredQueriesResult);

            const newQuery = this.allQueries.find(query => query.id === newId);

            if (newQuery) {
                this.selectedQueryId = newQuery.id;
                this.editName = newQuery.name;
                this.editDescription = newQuery.description;
                this.editSObject = newQuery.sobject;
                this.editSoql = newQuery.soql;
            }

            this.createName = '';
            this.createDescription = '';
            this.createSObject = '';
            this.createSoql = '';

            this.hasChanges = true;
            this.notifyQueriesUpdated();
            this.showToast('Success', 'Query created successfully!', 'success');
        } catch (error) {
            console.error('Error creating query:', error);
            this.showToast('Error', 'Failed to create query.', 'error');
        }
    }

    // error handling, confirming no malformation "editing" query etc.
    async handleSaveChanges() {
        if (!this.selectedQueryId) {
            this.showToast('Error', 'No query selected.', 'error');
            return;
        }

        const name = this.editName.trim();
        const description = this.editDescription.trim();
        const sObjectName = this.editSObject.trim();
        const soqlText = this.editSoql.trim();
        const isValid = await validateSOQL({ soqlText });

        if (!this.validateFields(name, description, sObjectName, soqlText)) {
            return;
        }

        if (this.isDuplicateName(name, this.selectedQueryId)) {
            this.showToast('Error', 'A query with this name already exists.', 'error');
            return;
        }

        if (!isValid) {
            this.showToast('Error', 'Invalid SOQL query.', 'error');
            return;
        }

        try {
            await updateUsefulQuery({
                queryId: this.selectedQueryId,
                name,
                description,
                sObjectName,
                soqlText
            });

            await refreshApex(this.wiredQueriesResult);

            const updatedQuery = this.allQueries.find(query => query.id === this.selectedQueryId);

            if (updatedQuery) {
                this.editName = updatedQuery.name;
                this.editDescription = updatedQuery.description;
                this.editSObject = updatedQuery.sobject;
                this.editSoql = updatedQuery.soql;
            }

            this.hasChanges = true;
            this.notifyQueriesUpdated();
            this.showToast('Success', 'Query updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating query:', error);
            this.showToast('Error', 'Failed to update query.', 'error');
        }
    }
    
    // on close make sure you notify
    handleClose() {
        this.close({ refresh: this.hasChanges });
    }
}