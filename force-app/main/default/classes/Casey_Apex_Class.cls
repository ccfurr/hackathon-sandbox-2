public with sharing class Casey_Apex_Class {

    // getEverything
    @AuraEnabled(cacheable=true)
    public static List<AggregateResult> getEverything() {
        return [SELECT Name_Field__c FROM Useful_Query__c GROUP BY Name_Field__c LIMIT 200];
    }

    // Get names lmao
    @AuraEnabled(cacheable=true)
    public static List<AggregateResult> getNames() {
        return [SELECT Name FROM Useful_Query__c GROUP BY Name LIMIT 200];
    }

    // Standard query
    @AuraEnabled(cacheable=true)
    public static List<Useful_Query__c> universalSearch() {
        return [SELECT FIELDS(STANDARD) FROM Useful_Query__c LIMIT 200];
    }

    // Read and delete query
    @AuraEnabled(cacheable=true)
    public static List<Useful_Query__c> getAllUsefulQueries() {
        return [SELECT Id, Name, Description__c, SOQL__c, SObject_API_Name__c FROM Useful_Query__c ORDER BY Name LIMIT 200];
    }

    // Create and edit queries
    @AuraEnabled(cacheable=true)
    public static List<Useful_Query__c> getUsefulQueries() {
        return [SELECT Id, Name, Description__c, Name_Field__c, SOQL__c FROM Useful_Query__c ORDER BY Name LIMIT 200];
    }

        @AuraEnabled
    public static Id createUsefulQuery(String name, String description, String sObjectName, String soqlText) {
        Useful_Query__c query = new Useful_Query__c();
        query.Name = name;
        query.Description__c = description;
        query.Name_Field__c = sObjectName;
        query.SOQL__c = soqlText;
        insert query;
        return query.Id;
    }

    @AuraEnabled
    public static void updateUsefulQuery(Id queryId, String name, String description, String sObjectName, String soqlText) {
        Useful_Query__c query = [
            SELECT Id, Name, Description__c, Name_Field__c, SOQL__c
            FROM Useful_Query__c
            WHERE Id = :queryId
            LIMIT 1
        ];

        query.Name = name;
        query.Description__c = description;
        query.Name_Field__c = sObjectName;
        query.SOQL__c = soqlText;
        update query;
    }


    // attempt at validation
    @AuraEnabled
    public static Boolean validateSOQL(String soqlText) {
        try {
            // prevent empty or null
            if (String.isBlank(soqlText)) {
                return false;
            }

            String queryToRun = soqlText.trim();
            
            // just so it doesn't grab the whole dataset, all we care about is whether it executes or not.
            if (!queryToRun.toLowerCase().contains('limit')) {
                queryToRun += ' LIMIT 1';
            }

        // Try executing
        Database.query(queryToRun);

        return true;
        } catch (Exception e) {
            return false;
    }
}
}