import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { getDocs, collection } from 'firebase/firestore';
import "../css/About2.css";

async function fetchDataFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "kannur"));

    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
    });
    return data;
}

const ViewCampMem2 = () => {
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
                    {userData.map((kannur) => (
                        <tr key={kannur.id}>
                            <td>{kannur.name}</td>
                            <td>{kannur.address}</td>
                            <td>{kannur.age}</td>
                            <td>{kannur.place}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ViewCampMem2;