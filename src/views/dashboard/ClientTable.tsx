import { CButton, CCardBody, CCol, CCollapse, CContainer, CRow, CSmartTable, CSpinner } from '@coreui/react-pro';
import { DatabaseService, User, emptyUser, formatCurrency } from 'src/db/database.ts';
import { useEffect, useState } from 'react';
import CreateClient from './CreateNewClient';
import { DisplayDetails } from './DisplayDetails';
import { DeleteClient } from './DeleteClient';
import { EditClient } from './EditClient';

const UsersTable = () => {
    const [showCreateNewClientModal, setShowCreateNewClientModal] = useState(false);
    const [showDisplayDetailsModal, setShowDisplayDetailsModal] = useState(false);
    const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
    const [showEditClientModal, setShowEditClientModal] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [details, setDetails] = useState<string[]>([])

    useEffect(() => {
        const fetchUsers = async () => {
            const db = new DatabaseService();
            let users = await db.getUsers();
            if (users !== null) {
                users = users as User[];
                setUsers(users);
                setIsLoading(false);``
            }
            
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
            {showEditClientModal && <EditClient showModal={showEditClientModal} setShowModal={setShowEditClientModal} users={users} currentUser={currentUser}/>}
            {showDisplayDetailsModal && <DisplayDetails showModal={showDisplayDetailsModal} setShowModal={setShowDisplayDetailsModal} users={users} currentUser={currentUser ?? emptyUser}/>}
            {showDeleteClientModal && <DeleteClient showModal={showDeleteClientModal} setShowModal={setShowDeleteClientModal} user={currentUser}/>}
            {showCreateNewClientModal && <CreateClient showModal={showCreateNewClientModal} setShowModal={setShowCreateNewClientModal} users={users}/>} 
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
                items={users}
                itemsPerPageSelect
                itemsPerPage={50}
                pagination
                sorterValue={{ column: 'firstName', state: 'asc' }}
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
                                    <CButton size="sm" color="warning" className="ml-1" variant="outline"
                                    onClick={() => {
                                        setShowEditClientModal(true);
                                        setCurrentUser(users.find(user => user.cid === item.cid))
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
                                        Unlink User 
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