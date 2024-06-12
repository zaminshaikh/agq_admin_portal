import { useTranslation } from "react-i18next";
import ActivitiesTable from "./ActivitiesTable";

const Activities = () => {
    const { t } = useTranslation()
    return (
        <div>
            <ActivitiesTable />
        </div>
    );
};

export default Activities;