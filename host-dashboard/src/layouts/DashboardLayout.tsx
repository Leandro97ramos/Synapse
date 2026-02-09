import React from 'react';

interface DashboardLayoutProps {
    sidebar: React.ReactNode;
    content: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ sidebar, content }) => {
    return (
        <div className="min-h-screen w-full bg-[#050505] text-white p-6 relative overflow-hidden flex items-stretch">
            {/* Dynamic Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vw] bg-blue-900/10 rounded-full blur-[120px] animate-pulse duration-[4s]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[100px]" />
            </div>

            {/* Main Content Container with spacing */}
            <div className="relative z-10 flex w-full h-[calc(100vh-3rem)]">
                {sidebar}
                {content}
            </div>
        </div>
    );
};

export default DashboardLayout;
