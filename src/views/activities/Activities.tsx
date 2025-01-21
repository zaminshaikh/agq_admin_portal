import { useTranslation } from "react-i18next";
import ActivitiesTable from "./ActivitiesTable";
import { useEffect, useState } from "react";
import { DatabaseService, Client } from "src/db/database";
import { CSpinner } from "@coreui/react-pro";
import ScheduledActivitiesTable from "./ScheduledActivitiesTable";

const Activities = () => {
    const { t } = useTranslation()

    return (
        <div>
            <ActivitiesTable />
            <ScheduledActivitiesTable />
        </div>
    );
};

export default Activities;