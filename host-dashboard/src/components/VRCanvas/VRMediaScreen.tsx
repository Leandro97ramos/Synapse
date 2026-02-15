import { MediaLoader } from './MediaLoader';
import { extend } from '@react-three/fiber';
import { DistortionMaterial } from './DistortionMaterial';

extend({ DistortionMaterial });

declare global {
    namespace JSX {
        interface IntrinsicElements {
            distortionMaterial: any;
        }
    }
}

interface VRMediaScreenProps {
    type: string;
    url: string;
    calibration: {
        scale: number;
        k1?: number;
        k2?: number;
    };
}

export const VRMediaScreen = ({ type, url, calibration }: VRMediaScreenProps) => {
    return (
        <MediaLoader type={type} url={url} calibration={calibration} />
    );
};
