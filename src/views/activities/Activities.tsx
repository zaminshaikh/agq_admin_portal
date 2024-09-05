import { useTranslation } from "react-i18next";
import ActivitiesTable from "./ActivitiesTable";
import { useEffect, useState } from "react";
import { DatabaseService, User } from "src/db/database";
import { CSpinner } from "@coreui/react-pro";

const Activities = () => {
    const { t } = useTranslation()

    return (
        <div>
            <ActivitiesTable />
        </div>
    );
};

export default Activities;