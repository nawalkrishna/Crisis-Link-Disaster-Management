import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { getDocs, collection } from 'firebase/firestore';
import "../css/About2.css";

async function fetchDataFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "campkannur"));

    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
    });
    return data;
}

const ViewCampDetails1 = () => {
    const [userData, setUserData] = useState([]);

    useEffect(() => {
        async function fetchData() {
            const data = await fetchDataFromFirestore();
            setUserData(data);
        }
        fetchData();
    }, []);

    return (
        <div className='aboutContainer'>
            <h1 className='text-5xl font-bold mb-8'>Camp Details</h1>
            <table className="table">
                <thead>
                    <tr>
                    <th>Place</th>
                        <th>Location</th>
                        <th>Current Inmates</th>
                        <th>Maximum Inmates</th>
                        
                    </tr>
                </thead>
                <tbody>
                    {userData.map((campkannur) => (
                        <tr key={campkannur.id}>
                            <td>{campkannur.Place}</td>
                            <td>{campkannur.Location}</td>
                            
                            
                          <td>{campkannur.CurrentInmates}</td>
                            <td>{campkannur.MaximumInmates}</td>
                         
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ViewCampDetails1;