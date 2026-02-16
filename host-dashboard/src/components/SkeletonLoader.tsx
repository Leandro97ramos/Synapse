import React from 'react';

interface SkeletonProps {
    className?: string;
    count?: number;
}

const SkeletonLoader: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div 
                    key={i} 
                    className={`animate-pulse bg-white/10 rounded ${className}`} 
                />
            ))}
        </>
    );
};

export default SkeletonLoader;
