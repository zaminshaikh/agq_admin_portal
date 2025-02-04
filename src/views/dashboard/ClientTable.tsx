import { CButton, CCardBody, CCol, CCollapse, CContainer, CRow, CSmartTable, CSpinner } from '@coreui/react-pro';
import { DatabaseService, Client, emptyClient, formatCurrency } from 'src/db/database.ts';
import { useEffect, useState } from 'react';
import CreateClient from './CreateClient';
import { DisplayClient } from './DisplayClient';
import { DeleteClient } from './DeleteClient';
import { EditClient } from './EditClient';
import ImportClients from './ImportClients';
import { UnlinkClient } from './UnlinkClient';
import { cilCheckCircle, cilXCircle } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const ClientsTable = () => {
    const [showUnlinkClientModal, setShowUnlinkClientModal] = useState(false);
    const [showImportClientsModal, setShowImportClientsModal] = useState(false);
    const [showCreateNewClientModal, setShowCreateNewClientModal] = useState(false);
    const [showDisplayDetailsModal, setShowDisplayDetailsModal] = useState(false);
    const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
    const [showEditClientModal, setShowEditClientModal] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [currentClient, setCurrentClient] = useState<Client | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [details, setDetails] = useState<string[]>([])

    // useEffect hook to fetch clients when the component mounts
    useEffect(() => {
        const fetchClients = async () => {
            // Create an instance of the DatabaseService
            const db = new DatabaseService();
            
            // Fetch clients from the database
            let clients = await db.getClients();
            
            // If clients are fetched successfully, update the state
            if (clients !== null) {
                clients = clients as Client[];
                setClients(clients);
                setIsLoading(false);
            }
        };
        
        // Call the fetchClients function
        fetchClients();
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
            _style: { width: '5%' },
            label: 'CID',
            filter: false,
            sorter: false,
        },
        {
            key: 'firstName',
            label: 'First',
            _style: { width: '10%'},
        },
        {
            key: 'lastName',
            label: 'Last',
            _style: { width: '10%'},
        },
        {
            key: 'initEmail',
            label: 'Email',
        },
        {
            key: 'totalAssets',
            label: 'Total Assets',
            _style: { width: '15%' },
        },
        {
            key: 'uid',
            label: 'Linked?',
            _style: { width: '15%' },
            filter: false,
        },
        {
            key: 'lastLoggedIn',
            label: 'Last Login',
            _style: { width: '15%' },
            filter: false,
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

    const handleSendInvite = () => {
        if (currentClient && currentClient.initEmail) {
          const subject = encodeURIComponent("AGQ App Invitation");
          
          const emailBody = 
            `Dear ${currentClient.firstName},\n\n` +
            "We hope this message finds you well.  AGQ is excited to launch our new app!\n" +
            "With this app, you can easily access your up-to-date investment information right from your phone.\n\n" +
            "To get started, please follow these steps:\n" +
            "   1. Click the Link:\n" +
            "       • For iOS Users: https://testflight.apple.com/join/e9kMgByH\n" +
            "       • For Android Users: https://play.google.com/apps/internaltest/4701740371572084825\n\n" +
            "       Important note: the app is only available on mobile devices and links must be open on such devices for download.\n\n" +
            `   2. Enter Your Client ID (CID): ${currentClient.cid} (This is a unique 8-digit identifier. Please keep it confidential).\n\n` +
            "   3. Set Up Your Account: Follow the instructions to create your account using your email and CID. This setup is a one-time process; you will not need to remember your CID for future logins.\n\n" +
            "We’ve designed the platform to be simple and intuitive. If you have questions or need any assistance, our support team is just a click away at management@agqconsulting.com.\n" +
            "Please note - The login via the website will be phased out in early 2025 so we appreciate your help with this transition.\n\n" +
            "Thank you for your continued trust in our team. We are excited to bring you a more convenient and seamless experience with this new app.\n\n" +
            "Cordially,\n\n" +
            "On behalf of Sonny and Kash\n\n" +
            "Melinda Toepp  |  Executive Assistant";
      
          const body = encodeURIComponent(emailBody);
      
          // Construct the mailto link
          window.location.href = `mailto:${currentClient.initEmail}?subject=${subject}&body=${body}`;
        }
      };
    
    return (
        <CContainer>
            {showUnlinkClientModal && <UnlinkClient showModal={showUnlinkClientModal} setShowModal={setShowUnlinkClientModal} client={currentClient} setClients={setClients}/>}
            {showImportClientsModal && <ImportClients showModal={showImportClientsModal} setShowModal={setShowImportClientsModal} clients={clients}/>}
            {showEditClientModal && <EditClient showModal={showEditClientModal} setShowModal={setShowEditClientModal} clients={clients} setClients={setClients} activeClient={currentClient}/>}
            {showDisplayDetailsModal && <DisplayClient showModal={showDisplayDetailsModal} setShowModal={setShowDisplayDetailsModal} clients={clients} currentClient={currentClient ?? emptyClient}/>}
            {showDeleteClientModal && <DeleteClient showModal={showDeleteClientModal} setShowModal={setShowDeleteClientModal} client={currentClient} setClients={setClients}/>}
            {showCreateNewClientModal && <CreateClient showModal={showCreateNewClientModal} setShowModal={setShowCreateNewClientModal} clients={clients} setClients={setClients}/>} 
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
                    uid: (item: Client) => (
                        <td className="text-center">
                            {item.uid && item.uid.trim() !== '' ? (
                                <CIcon icon={cilCheckCircle} className="text-success" />
                            ) : (
                                <CIcon icon={cilXCircle} className="text-danger" />
                            )}
                        </td>
                    ),
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
                                    <CButton size="sm" color="danger" className="ml-1" variant="outline" 
                                        onClick={() => {
                                            setShowDeleteClientModal(true);
                                            setCurrentClient(clients.find(client => client.cid === item.cid))
                                        }}>
                                        Delete Client
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton size="sm" color="primary" className="ml-1" variant="outline"
                                    onClick={() => {
                                        setShowUnlinkClientModal(true);
                                        setCurrentClient(clients.find(client => client.cid === item.cid))
                                    }}>
                                        Unlink Client 
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton size="sm" color="info" className='ml-1' variant="outline" 
                                        onClick={() => {
                                            setCurrentClient(clients.find(client => client.cid === item.cid))
                                            handleSendInvite();
                                        }}>
                                        Send Invite
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton size="sm" color="warning" className="ml-1" variant="outline"
                                    onClick={() => {
                                        setShowEditClientModal(true);
                                        setCurrentClient(clients.find(client => client.cid === item.cid))
                                    }}>
                                        Edit Client 
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

export default ClientsTable;