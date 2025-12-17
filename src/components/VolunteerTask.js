import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { getDocs, collection } from 'firebase/firestore';
import "../css/About2.css";

async function fetchDataFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "task"));

    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
    });
    return data;
}

const VolunteerTask = () => {
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
            <h1 className='text-5xl font-bold mb-8'>VOLUNTEERS TASK</h1>
            <table className="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>NAME</th>
                        <th>PHONE NUMBER</th>
                        <th>LOCATION</th>
                        <th>TASK</th>
                    </tr>
                </thead>
                <tbody>
                    {userData.map((task) => (
                        <tr key={task.id}>
                            <td>{task.VolunteerId}</td>
                            <td>{task.VolunteerName}</td>
                            <td>{task.PhoneNumber}</td>
                            <td>{task.Location}</td>
                            <td>{task.Task}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default VolunteerTask;

