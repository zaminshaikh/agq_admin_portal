import { CButton, CCardBody, CCol, CCollapse, CContainer, CRow, CSmartTable, CSpinner } from '@coreui/react-pro';
import { DatabaseService, Client, emptyClient, formatCurrency } from 'src/db/database.ts';
import { useEffect, useState } from 'react';
import CreateClient from './CreateClient';
import { DisplayClient } from './DisplayClient';
import { DeleteClient } from './DeleteClient';
import { EditClient } from './EditClient';
import ImportClients from './ImportClients';
import { UnlinkClient } from './UnlinkClient';
import SendInviteModal from './SendInviteModal';
import { cilCheckCircle, cilCloudDownload, cilXCircle, cilEnvelopeClosed } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import { usePermissions } from '../../contexts/PermissionContext';

const ClientsTable = () => {
    const { canWrite, admin, adminService } = usePermissions();
    const [showUnlinkClientModal, setShowUnlinkClientModal] = useState(false);
    const [showImportClientsModal, setShowImportClientsModal] = useState(false);
    const [showCreateNewClientModal, setShowCreateNewClientModal] = useState(false);
    const [showDisplayDetailsModal, setShowDisplayDetailsModal] = useState(false);
    const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
    const [showEditClientModal, setShowEditClientModal] = useState(false);
    const [showSendInviteModal, setShowSendInviteModal] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [currentClient, setCurrentClient] = useState<Client | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [details, setDetails] = useState<string[]>([])

    // Initialize database service with current admin
    useEffect(() => {
        if (admin) {
            const db = new DatabaseService();
            db.setCurrentAdmin(admin);
        }
    }, [admin]);

    // useEffect hook to fetch clients when the component mounts
    useEffect(() => {
        const fetchClients = async () => {
            // Create an instance of the DatabaseService
            const db = new DatabaseService();
            if (admin) {
                db.setCurrentAdmin(admin);
            }
            
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
    }, [admin]); // Re-run when admin changes to ensure proper audit trail

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
            key: 'linked',
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

    // Function to export clients data to CSV
    const exportToCSV = () => {
        // Define CSV headers for all relevant client properties, excluding specified fields
        const headers = [
            'CID', 'First Name', 'Last Name', 'Email', 'App Email',
            'Phone Number', 'Address', 'Date of Birth', 'First Deposit Date',
            'Total Assets', 'YTD', 'Total YTD', 'Linked', 'Last Login',
            'Beneficiaries', 'Notes'
        ];
        
        // Helper function to properly escape and format CSV values
        const formatCSVValue = (value: any) => {
            if (value === null || value === undefined) {
                return '';
            }
            
            // Handle arrays by joining with semicolons
            if (Array.isArray(value)) {
                value = value.join('; ');
            }
            
            // Convert value to string
            const stringVal = String(value);
            
            // If value contains commas, quotes, or newlines, wrap in quotes and escape any quotes
            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            
            return stringVal;
        };
        
        // Helper function to format dates
        const formatDate = (date: Date | null): string => {
            if (!date) return '';
            return date.toLocaleDateString();
        };
        
        // Sort clients by firstName before generating CSV
        const sortedClients = [...clients].sort((a, b) => 
            a.firstName.localeCompare(b.firstName)
        );
        
        // Format client data into CSV rows with all properties except excluded ones
        const rows = sortedClients.map(client => [
            `="${client.cid}"`, // Preserve leading zeros in CID
            formatCSVValue(client.firstName),
            formatCSVValue(client.lastName),
            formatCSVValue(client.initEmail),
            formatCSVValue(client.appEmail),
            formatCSVValue(client.phoneNumber),
            formatCSVValue(client.address),
            formatCSVValue(formatDate(client.dob)),
            formatCSVValue(formatDate(client.firstDepositDate)),
            formatCSVValue(client.totalAssets),
            formatCSVValue(client.ytd),
            formatCSVValue(client.totalYTD),
            formatCSVValue(client.linked ? 'Yes' : 'No'),
            formatCSVValue(client.lastLoggedIn || ''),
            formatCSVValue(client.beneficiaries),
            formatCSVValue(client.notes)
        ]);
        
        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'clients-data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    return (
        <CContainer>
            {showUnlinkClientModal && <UnlinkClient showModal={showUnlinkClientModal} setShowModal={setShowUnlinkClientModal} client={currentClient} setClients={setClients}/>}
            {showImportClientsModal && <ImportClients showModal={showImportClientsModal} setShowModal={setShowImportClientsModal} clients={clients}/>}
            {showEditClientModal && <EditClient showModal={showEditClientModal} setShowModal={setShowEditClientModal} clients={clients} setClients={setClients} activeClient={currentClient}/>}
            {showDisplayDetailsModal && <DisplayClient showModal={showDisplayDetailsModal} setShowModal={setShowDisplayDetailsModal} clients={clients} currentClient={currentClient ?? emptyClient}/>}
            {showDeleteClientModal && <DeleteClient showModal={showDeleteClientModal} setShowModal={setShowDeleteClientModal} client={currentClient} setClients={setClients}/>}
            {showCreateNewClientModal && <CreateClient showModal={showCreateNewClientModal} setShowModal={setShowCreateNewClientModal} clients={clients} setClients={setClients}/>}
            {showSendInviteModal && <SendInviteModal showModal={showSendInviteModal} setShowModal={setShowSendInviteModal} client={currentClient}/>} 
            <CRow className="mb-3">
              <CCol>
                <CButton 
                    color='primary' 
                    onClick={() => setShowCreateNewClientModal(true)} 
                    className="w-100"
                    disabled={!canWrite}
                >
                    + Add Client
                </CButton>
              </CCol>
              <CCol>
                <CButton color='success' onClick={exportToCSV} className="w-100">
                  <CIcon icon={cilCloudDownload} className="me-2" /> Export to CSV
                </CButton>
              </CCol>
            </CRow>
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
                    linked: (item: Client) => (
                        <td className="text-center">
                            {item.linked ? (
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
                            <CRow className="mb-2">
                                <CCol className="text-center">
                                    <CButton 
                                        size="sm" 
                                        color="danger" 
                                        className="ml-1" 
                                        variant="outline"
                                        disabled={!canWrite}
                                        onClick={() => {
                                            setShowDeleteClientModal(true);
                                            setCurrentClient(clients.find(client => client.cid === item.cid))
                                        }}>
                                        Delete Client
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton 
                                        size="sm" 
                                        color="primary" 
                                        className="ml-1" 
                                        variant="outline"
                                        disabled={!canWrite}
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
                                            setShowDisplayDetailsModal(true)
                                            setCurrentClient(clients.find(client => client.cid === item.cid))
                                        }}>
                                        Client Details
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton 
                                        size="sm" 
                                        color="warning" 
                                        className="ml-1" 
                                        variant="outline"
                                        disabled={!canWrite}
                                        onClick={() => {
                                            setShowEditClientModal(true);
                                            setCurrentClient(clients.find(client => client.cid === item.cid))
                                        }}>
                                        Edit Client 
                                    </CButton>
                                </CCol>
                            </CRow>
                            <CRow>
                                <CCol className="text-center">
                                    <CButton 
                                        size="sm" 
                                        color="success" 
                                        className="ml-1" 
                                        variant="outline"
                                        disabled={!canWrite || (!item.initEmail && !item.appEmail)}
                                        onClick={() => {
                                            setShowSendInviteModal(true);
                                            setCurrentClient(clients.find(client => client.cid === item.cid))
                                        }}
                                        title={(!item.initEmail && !item.appEmail) ? "Client must have an email address" : "Send app invitation email"}
                                    >
                                        <CIcon icon={cilEnvelopeClosed} className="me-1" />
                                        Send Invite
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