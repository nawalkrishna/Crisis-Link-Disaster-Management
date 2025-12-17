import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { getDocs, collection } from 'firebase/firestore';
import "../css/About2.css";

async function fetchDataFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "wayanad"));

    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
    });
    return data;
}

const ViewCampMem = () => {
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
            <h1 className='text-5xl font-bold mb-8'>Camp Members</h1>
            <table className="table">
                <thead>
                    <tr>
                        
                        <th>NAME</th>
                        <th>ADDRESS</th>
                        <th>AGE</th>
                        <th>PLACE</th>
                    </tr>
                </thead>
                <tbody>
                    {userData.map((wayanad) => (
                        <tr key={wayanad.id}>
                            <td>{wayanad.name}</td>
                            <td>{wayanad.address}</td>
                            <td>{wayanad.age}</td>
                            <td>{wayanad.place}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ViewCampMem;