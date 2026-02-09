import { useParams } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import Sidebar from '../components/Sidebar';
import FolderPanel from '../components/FolderPanel';
import AssetViewer from '../components/AssetViewer';

const DashboardPage = () => {
    const { folderId } = useParams();

    return (
        <DashboardLayout
            sidebar={<Sidebar />}
            content={folderId ? <AssetViewer /> : <FolderPanel />}
        />
    );
};

export default DashboardPage;
