import { CButton, CCardBody, CCol, CCollapse, CContainer, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CRow, CSmartTable, CSpinner } from '@coreui/react-pro';
import { DatabaseService, User, formatCurrency } from 'src/db/database.ts';
import { useEffect, useState } from 'react';
import CreateNewClient from './CreateNewClient';
import { DisplayDetails } from './DisplayDetails';
import { DeleteClient } from './DeleteClient';

const UsersTable = () => {
    const [showCreateNewClientModal, setShowCreateNewClientModal] = useState(false);
    const [showDisplayDetailsModal, setShowDisplayDetailsModal] = useState(false);
    const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [details, setDetails] = useState<string[]>([])

    useEffect(() => {
        const fetchUsers = async () => {
            const db = new DatabaseService();
            const users = await db.getUsers();
            setUsers(users);
            setIsLoading(false);
            console.log(JSON.stringify(users))
        };
        fetchUsers();
    }, []);

    if (isLoading) {
        return( 
        <div className="text-center">
            <CSpinner color="primary"/>
        </div>
        )
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
            // formatter: (cellContent: number) => {
            //     return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cellContent);
            // }
        },
        {
            key: 'show_details',
            label: '',
            _style: { width: '1%' },
            filter: false,
            sorter: false,
        },
    ]

    const toggleDetails = (index: string) => {
        const position = details.indexOf( index)
        let newDetails = details.slice()
        if (position !== -1) {
            newDetails.splice(position, 1)
        } else {
            newDetails = [...details, index]
        }
        setDetails(newDetails)
    }
    
    return (
        <CContainer>
            {showDisplayDetailsModal && <DisplayDetails showModal={showDisplayDetailsModal} setShowModal={setShowDisplayDetailsModal} user={currentUser}/>}
            {showDeleteClientModal && <DeleteClient showModal={showDeleteClientModal} setShowModal={setShowDeleteClientModal} user={currentUser}/>}
            {showCreateNewClientModal && <CreateNewClient showModal={showCreateNewClientModal} setShowModal={setShowCreateNewClientModal} users={users}/>} 
            <div className="d-grid gap-2">
                <CButton color='primary' onClick={() => setShowCreateNewClientModal(true)}>Add Client +</CButton>
            </div> 
            <CSmartTable
                activePage={1}
                cleaner
                clickableRows
                columns={columns}
                columnFilter
                columnSorter
                items={users}
                itemsPerPageSelect
                itemsPerPage={50}
                pagination
                scopedColumns={{
                    totalAssets: (item: User) => (
                        <td>
                            {formatCurrency(item.totalAssets)}
                        </td>
                    ),
                    show_details: (item: User) => {
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
                                            setCurrentUser(users.find(user => user.cid === item.cid))
                                        }}>
                                        Client Details
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton size="sm" color="warning" className="ml-1" variant="outline">
                                        Edit Client
                                    </CButton>
                                </CCol>
                                <CCol className="text-center">
                                    <CButton size="sm" color="danger" className="ml-1" variant="outline" 
                                        onClick={() => {
                                            setShowDeleteClientModal(true);
                                            setCurrentUser(users.find(user => user.cid === item.cid))
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