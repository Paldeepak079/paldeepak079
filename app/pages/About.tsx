import React from 'react';
import { Lanyard } from '../components/Lanyard/Lanyard';

export default function About() {
  return (
    <div className="about-container">
      <div className="lanyard-section" style={{ width: '100%', height: '100vh' }}>
        <Lanyard />
      </div>
      {/* Add your other about page content here */}
    </div>
  );
} 