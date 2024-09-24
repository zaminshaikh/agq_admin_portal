import { CButton, CContainer, CSpinner, CCard, CCardBody, CCardTitle, CCardSubtitle, CCardText, CCollapse, CRow, CCol, CFormInput } from '@coreui/react-pro';
import { DatabaseService, User, emptyUser, formatCurrency } from 'src/db/database.ts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StatementsUsersButtons = () => {
    const [showCreateNewClientModal, setShowCreateNewClientModal] = useState(false);
    const [showDisplayDetailsModal, setShowDisplayDetailsModal] = useState(false);
    const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
    const [showEditClientModal, setShowEditClientModal] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [details, setDetails] = useState<string[]>([]);
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const navigate = useNavigate();

    // useEffect hook to fetch users when the component mounts
    useEffect(() => {
        const fetchUsers = async () => {
            // Create an instance of the DatabaseService
            const db = new DatabaseService();
            
            // Fetch users from the database
            let users = await db.getUsers();
            
            // If users are fetched successfully, update the state
            if (users !== null) {
                users = users as User[];
                setUsers(users);
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

    const handleMouseEnter = (cid: string) => {
        setHoveredButton(cid);
    };

    const handleMouseLeave = () => {
        setHoveredButton(null);
    };

    // Filter users based on search query
    const filteredUsers = users.filter(user => 
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.cid.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleManageStatementsClick = (user: User) => {
        navigate('/client-statements', { state: { client: user } });
    };

    return (
        <CContainer>
            <CFormInput
                type="text"
                placeholder="Search by CID or Client Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-3"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {filteredUsers.map(user => (
                    <CCard key={user.cid} style={{ width: '18rem' }}>
                        <CCardBody>
                            <CCardTitle>{user.firstName} {user.lastName}</CCardTitle>
                            <CCardSubtitle className="mb-2 text-body-secondary">{user.cid}</CCardSubtitle>
                            <CButton
                                color={hoveredButton === user.cid ? 'primary' : 'secondary'}
                                onMouseEnter={() => handleMouseEnter(user.cid)}
                                onMouseLeave={handleMouseLeave}
                                onClick={() => handleManageStatementsClick(user)}
                                style={{ width: '100%' }}
                            >
                                Manage Statements
                            </CButton>
                        </CCardBody>
                    </CCard>
                ))}
            </div>
        </CContainer>
    )
}

export default StatementsUsersButtons;