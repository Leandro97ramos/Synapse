import DashboardLayout from '../layouts/DashboardLayout';
import Sidebar from '../components/Sidebar';
import FolderPanel from '../components/FolderPanel';

const DashboardPage = () => {
    return (
        <DashboardLayout
            sidebar={<Sidebar />}
            content={<FolderPanel />}
        />
    );
};

export default DashboardPage;
