import { CButton, CCardBody, CCol, CCollapse, CContainer, CRow, CSmartTable, CSpinner } from '@coreui/react-pro';
import { DatabaseService, Client, emptyUser, formatCurrency } from 'src/db/database.ts';
import { useEffect, useState } from 'react';
import CreateClient from './CreateClient';
import { DisplayClient } from './DisplayClient';
import { DeleteClient } from './DeleteClient';
import { EditClient } from './EditClient';
import ImportClients from './ImportClients';

const UsersTable = () => {
    const [showImportClientsModal, setShowImportClientsModal] = useState(false);
    const [showCreateNewClientModal, setShowCreateNewClientModal] = useState(false);
    const [showDisplayDetailsModal, setShowDisplayDetailsModal] = useState(false);
    const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
    const [showEditClientModal, setShowEditClientModal] = useState(false);
    const [clients, setUsers] = useState<Client[]>([]);
    const [currentUser, setCurrentUser] = useState<Client | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [details, setDetails] = useState<string[]>([])

    // useEffect hook to fetch clients when the component mounts
    useEffect(() => {
        const fetchUsers = async () => {
            // Create an instance of the DatabaseService
            const db = new DatabaseService();
            
            // Fetch clients from the database
            let clients = await db.getUsers();
            
            // If clients are fetched successfully, update the state
            if (clients !== null) {
                clients = clients as Client[];
                setUsers(clients);
                setIsLoading(false);
            }
        };
        
        // Call the fetchUsers function
        fetchUsers();
    }, []); // Empty dependency array ensures this runs only once when the component mounts

    // If data is still loading, display a spinner
    if (isLoading) {
        return( 
            <div className="text-center">
                <CSpinner color="primary"/>
            </div>
        );
    }
    
    const columns = [
        {
            key: 'cid',
            label: 'CID',
            filter: false,
            sorter: false,
        },
        {
            key: 'firstName',
            label: 'First',
            _style: { width: '15%'},
        },
        {
            key: 'lastName',
            label: 'Last',
            _style: { width: '15%'},
        },
        {
            key: 'initEmail',
            label: 'Email',
        },
        {
            key: 'totalAssets',
            label: 'Total Assets',
        },
        {
            key: 'show_details',
            label: '',
            _style: { width: '1%' },
            filter: false,
            sorter: false,
        },
    ]

    // Function to toggle the visibility of details for a specific item
    const toggleDetails = (index: string) => {
        // Find the position of the index in the details array
        const position = details.indexOf(index);
    
        // Create a copy of the details array
        let newDetails = details.slice();
    
        // If the index is already in the details array, remove it
        if (position !== -1) {
            newDetails.splice(position, 1);
        } else {
            // If the index is not in the details array, add it
            newDetails = [...details, index];
        }
    
        // Update the state with the new details array
        setDetails(newDetails);
    }
    
    return (
        <CContainer>
            {showImportClientsModal && <ImportClients showModal={showImportClientsModal} setShowModal={setShowImportClientsModal} clients={clients}/>}
            {showEditClientModal && <EditClient showModal={showEditClientModal} setShowModal={setShowEditClientModal} clients={clients} activeClient={currentUser}/>}
            {showDisplayDetailsModal && <DisplayClient showModal={showDisplayDetailsModal} setShowModal={setShowDisplayDetailsModal} clients={clients} currentUser={currentUser ?? emptyUser}/>}
            {showDeleteClientModal && <DeleteClient showModal={showDeleteClientModal} setShowModal={setShowDeleteClientModal} client={currentUser}/>}
            {showCreateNewClientModal && <CreateClient showModal={showCreateNewClientModal} setShowModal={setShowCreateNewClientModal} clients={clients}/>} 
            <div className="d-grid gap-2 py-3">
                <CButton color='secondary' onClick={() => setShowImportClientsModal(true)}>Import Clients</CButton>
            </div> 
            <div className="d-grid gap-2">
                <CButton color='primary' onClick={() => setShowCreateNewClientModal(true)}>Add Client +</CButton>
            </div> 
            <CSmartTable
                activePage={1}
                cleaner
                clickableRows
                selectable
                columns={columns}
                columnFilter
                columnSorter
                items={clients}
                itemsPerPageSelect
                itemsPerPage={50}
                pagination
                sorterValue={{ column: 'firstName', state: 'asc' }}
                scopedColumns={{
                    totalAssets: (item: Client) => (
                        <td>
                            {formatCurrency(item.totalAssets)}
                        </td>
                    ),
                    show_details: (item: Client) => {
                        return (
                        <td className="py-2">
                            <CButton
                            color="primary"
                            variant="outline"
                            shape="square"
                            size="sm"
                            onClick={() => {
                                toggleDetails(item.cid)
                            }}
                            >
                            {details.includes(item.cid) ? 'Hide' : 'Show'}
                            </CButton>
                        </td>
                        )
                    },
                    details: (item) => {
                        return (
                        <CCollapse visible={details.includes(item.cid)}>
                        <CCardBody className="p-3">
                            <CRow>
                                <CCol className="text-center">
                                    <CButton size="sm" color="info" className='ml-1' variant="outline" 
                                        onClick={() => {
                                            setShowDisplayDetailsModal(true)
                                            setCurrentUser(clients.find(client => client.cid === item.cid))
                                        }}>
                                        Client Details
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton size="sm" color="warning" className="ml-1" variant="outline"
                                    onClick={() => {
                                        setShowEditClientModal(true);
                                        setCurrentUser(clients.find(client => client.cid === item.cid))
                                    }}>
                                        Edit Client 
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton size="sm" color="warning" className="ml-1" variant="outline"
                                    onClick={() => {
                                        const db = new DatabaseService();
                                        db.unlinkUser(item.cid);
                                    }}>
                                        Unlink Client 
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton size="sm" color="danger" className="ml-1" variant="outline" 
                                        onClick={() => {
                                            setShowDeleteClientModal(true);
                                            setCurrentUser(clients.find(client => client.cid === item.cid))
                                        }}>
                                        Delete Client
                                    </CButton>
                                </CCol>
                            </CRow>
                        </CCardBody>
                    </CCollapse>
                        )
                    },
                }}
            />
        </CContainer>
    )
}

export default UsersTable;