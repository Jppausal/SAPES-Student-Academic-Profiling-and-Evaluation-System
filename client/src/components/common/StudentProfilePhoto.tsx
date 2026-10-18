import React from 'react';
import { UserRound } from 'lucide-react';
import juanDelaCruzPhoto from '../../assets/profiles/Juandelacruz.jpg';

const profilePhotos: Record<string, string> = {
  '2021301234': juanDelaCruzPhoto,
};

interface StudentProfilePhotoProps {
  institutionId: string;
  studentName: string;
  className: string;
  fallback?: React.ReactNode;
}

export const StudentProfilePhoto: React.FC<StudentProfilePhotoProps> = ({
  institutionId,
  studentName,
  className,
  fallback,
}) => {
  const photo = profilePhotos[institutionId];
  if (!photo) {
    return fallback ?? (
      <span
        role="img"
        aria-label={`${studentName} profile photo placeholder`}
        className={`${className} flex items-center justify-center bg-slate-100 text-slate-400`}
      >
        <UserRound aria-hidden="true" className="h-1/2 w-1/2" />
      </span>
    );
  }

  return <img src={photo} alt={`${studentName} profile`} className={className} />;
};
