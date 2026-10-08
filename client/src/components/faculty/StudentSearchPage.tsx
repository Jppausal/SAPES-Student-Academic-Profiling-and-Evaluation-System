import React from 'react';
import { BackendStudentSearch } from './BackendStudentSearch';

interface StudentSearchPageProps {
  initialQuery?: string;
}

export const StudentSearchPage: React.FC<StudentSearchPageProps> = ({ initialQuery = '' }) => (
  <BackendStudentSearch initialQuery={initialQuery} />
);
