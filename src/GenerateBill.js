import React, { useState } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js'; // Import html2pdf.js
import './index.css';

const GenerateBill = () => {
  const [data, setData] = useState({
    registrationNumber: '',
    wardNumber: '',
    arrivalTime: '',
    departureTime: '',
    distance: '',
    time: '',
    weight: '',
  });

  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['wardNumber', 'arrivalTime', 'departureTime', 'distance', 'time', 'weight'].includes(name);
    setData({ ...data, [name]: isNumeric ? parseFloat(value) || 0 : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data: responseData } = await axios.post('http://localhost:8080/api/bills', data);
      setResponse(responseData);
    } catch (error) {
      console.error(error);
      setError('Failed to generate bill. Please try again.');
    }
  };
  
  // <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

  function generatePDF(){
    const element = document.getElementById('billTable');
    if (element) {
      html2pdf().from(element).set({
        margin: [10, 0, 10, 0], // Optional margins for the PDF, if needed
        filename: 'bill.pdf',
        html2canvas: { scale: 2 }, // Increase scale for better resolution
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      }).save();
    } else {
      console.error('Element #billTable not found!');
    }
}
  

  return (
    <div className="form-container">
      <h1>Generate Bill</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Registration Number" name="registrationNumber" onChange={handleChange} value={data.registrationNumber} required />
        <input type="number" placeholder="Ward Number" name="wardNumber" onChange={handleChange} value={data.wardNumber} required />
        <input type="number" placeholder="Arrival Time" name="arrivalTime" onChange={handleChange} value={data.arrivalTime} required />
        <input type="number" placeholder="Departure Time" name="departureTime" onChange={handleChange} value={data.departureTime} required />
        <input type="number" placeholder="Distance" name="distance" onChange={handleChange} value={data.distance} required />
        <input type="number" placeholder="Time" name="time" onChange={handleChange} value={data.time} required />
        <input type="number" placeholder="Weight" name="weight" onChange={handleChange} value={data.weight} required />
        <button type="submit">Generate Bill</button>
      </form>
      {error && <p className="error">{error}</p>}
      {response && (
        <>
          <table id="billTable">
            <tbody>
              <tr><th>Field</th><th>Value</th></tr>
              {Object.entries(response).map(([key, value]) => (
                <tr key={key}><td>{key}</td><td>{value.toString()}</td></tr>
              ))}
            </tbody>
          </table>
          <button onClick={generatePDF}>Download Bill as PDF</button>
        </>
      )}
    </div>
  );
};

export default GenerateBill;



//e55977c3-7021-43e0-ac46-d13edec4d2c3