import React, { useEffect, useState } from 'react';
import {
  CContainer,
  CSmartTable,
  CSpinner,
} from '@coreui/react-pro';
import { getStorage, ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { DatabaseService, Client } from 'src/db/database.ts';

interface Statement {
  clientName: string;
  statementTitle: string;
  dateAdded: string;
  downloadURL: string;
}

const ClientStatementsPage = () => {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStatements = async () => {
      try {
        // Fetch all clients
        const db = new DatabaseService();
        const clients: Client[] = await db.getClients();
        console.log('Fetched clients:', clients.length);

        const storage = getStorage();

        // Create an array of promises to fetch statements for each client
        const clientPromises = clients.map(async (client) => {
          const cid = client.cid;
          console.log('Processing client CID:', cid);

          // Reference to the client's statements folder
          const listRef = ref(storage, `testUsersStatements/${cid}/`);

          try {
            // List all items in the folder
            const res = await listAll(listRef);
            console.log(`Items found in ${cid}'s folder:`, res.items.length);

            if (res.items.length === 0) {
              console.log(`No items found in ${cid}'s folder.`);
              return []; // Return empty array if no statements
            }

            // Fetch statements for this client
            const statementPromises = res.items.map(async (itemRef) => {
              const metadata = await getMetadata(itemRef);
              const downloadURL = await getDownloadURL(itemRef);
              console.log('Processing item:', metadata.name);

              const statement: Statement = {
                clientName: `${client.firstName} ${client.lastName}`,
                statementTitle: metadata.name,
                dateAdded: metadata.timeCreated,
                downloadURL: downloadURL,
              };

              return statement;
            });

            // Wait for all statements of this client
            const clientStatements = await Promise.all(statementPromises);
            return clientStatements;
          } catch (error) {
            console.error(`Error fetching statements for CID ${cid}:`, error);
            return []; // Return empty array on error
          }
        });

        // Wait for all clients' statements
        const allStatementsArrays = await Promise.all(clientPromises);

        // Flatten the array of arrays into a single array
        const statementsData = allStatementsArrays.flat();

        // Sort statements by dateAdded, newest first
        statementsData.sort(
          (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        );

        console.log('Total statements fetched:', statementsData.length);

        setStatements(statementsData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching statements:', error);
        setIsLoading(false);
      }
    };

    fetchStatements();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center">
        <CSpinner color="primary" />
      </div>
    );
  }

  const columns = [
    { key: 'clientName', label: 'Name', _style: { width: '30%' } },
    { key: 'statementTitle', label: 'Statement', _style: { width: '40%' } },
    { key: 'dateAdded', label: 'Date', _style: { width: '20%' }, sorter: true },
  ];

  const items = statements.map((statement) => ({
    ...statement,
    dateAdded: new Date(statement.dateAdded).toLocaleDateString(),
  }));

  return (
    <CContainer>
      <CSmartTable
        items={items}
        columns={columns}
        columnSorter
        itemsPerPage={10}
        pagination
        tableProps={{ striped: true, hover: true }}
      />
    </CContainer>
  );
};

export default ClientStatementsPage;