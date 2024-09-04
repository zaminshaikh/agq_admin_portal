import { useTranslation } from "react-i18next";
import ActivitiesTable from "./ActivitiesTable";
import { useEffect, useState } from "react";
import { DatabaseService, User } from "src/db/database";
import { CSpinner } from "@coreui/react-pro";

const Activities = () => {
    const { t } = useTranslation()
    const [user, setUser] = useState<User>();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchActivities = async () => {
            const db = new DatabaseService();
            const users = await db.getUsers();
            setUsers(users);
            setIsLoading(false);
        };
        fetchActivities();
    }, []);
    
    if (isLoading) {
        return( 
            <div className="text-center">
                <CSpinner color="primary"/>
            </div>
        )
    }

    return (
        <div>
            <ActivitiesTable />
        </div>
    );
};

export default Activities;