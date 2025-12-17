import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { getDocs, collection } from 'firebase/firestore';
import "../css/About2.css";

async function fetchDataFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "needs"));

    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
    });
    return data;
}

const CampRequ = () => {
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
            <h1 className='text-5xl font-bold mb-8'>Camp Requirements</h1>
            <table className="table">
                <thead>
                    <tr>
                    <th>DISTRICT</th>
                        <th>LOCATION</th>
                        <th>NEEDS</th>
                        <th>PHONE</th>
                        
                    </tr>
                </thead>
                <tbody>
                    {userData.map((needs) => (
                        <tr key={needs.id}>
                            <td>{needs.district}</td>
                            <td>{needs.location}</td>
                            <td>{needs.need}</td>
                            <td>{needs.phoneNumber}</td>
                         
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CampRequ;