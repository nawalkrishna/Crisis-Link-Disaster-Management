import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { getDocs, collection } from 'firebase/firestore';
import "../css/AboutPage.css";

async function fetchDataFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "emergency"));

    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
    });
    return data;
}

const Emergency = () => {
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
            <h1 className='text-5xl font-bold mb-8'>Emergency Contacts</h1>
            <table className="table-fixed w-full">
                <thead>
                    <tr>
                        <th className="w-3/5 px-4 py-2 text-left">District</th>
                        <th className="w-2/5 px-4 py-2 text-left pl-8">Phone Number</th>
                    </tr>
                </thead>
                <tbody>
                    {userData.map((emergency) => (
                        <tr key={emergency.id}>
                            <td className="border px-4 py-2 text-left">{emergency.District}</td>
                            <td className="border px-4 py-2">{emergency.PhoneNumber}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Emergency;





