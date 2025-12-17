import Reac, {useEffect,useState} from 'react';
import "../css/AboutPage.css"
import {db} from './firebaseConfig';
import { getDoc, collection} from 'firebase/firestore'

async function fetchDataFromFirestore(){
    const querySnapshot = await getDocs(collection(db, "emergency"))

        const data =[];
        querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data()});

        })
        return data;


}
const Emergency = () => {
    const [userData, setUserData] = useState([]);

    useEffect(() =>{
        async function fetchData() {
            const data = await fetchDataFromFirestore();
            setUserData(data);
         }
         fetchData();
    }, [])




return (
    <div className='aboutContainer'>
    <h1 className='text-5xl font-bold'>Emergency Contacts</h1>
    <div>
    {userData.map((emergency) => (
        <div key={emergency.id} className='mb-4'>
            <p className='text-xl font-bold'>{emergency.District}</p>
        <p>{emergency.PhoneNumber}</p>
        </div>
    
    
    ))}

    </div>
   
    </div>
  );
};

export default Emergency;