import React from 'react';
import { Routes, Route } from 'react-router-dom';
import About from './pages/About';

function App() {
  return (
    <Routes>
      <Route path="/about" element={<About />} />
      {/* Add other routes here */}
    </Routes>
  );
}

export default App; 