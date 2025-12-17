import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import NavigationBar from './components/NavigationBar';
import UserHome2 from './components/UserHome2';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import VolunteerReg from './components/VolunteerReg';
import Volunteerlogin from './components/Volunteerlogin';
import VolunteerHome from './components/VolunteerHome';
import UserHome from './components/UserHome';
import MemAdd from './components/MemAdd';
import MemView from './components/MemView'
import "./App.css"
import DonateCard from './components/DonateCard';
import CommunicationToolsCard from './components/CommunicationToolsCard';
import DonationForm from './components/DonationForm';
import VolunteerTask from './components/VolunteerTask';
import CampDetaills from './components/CampDetails'
import ViewCampDetailsCard from './components/ViewCampDetailsCard';
import Kannur from './components/Kannur';
import Wayanad from './components/Wayanad';
import Kozhikod from './components/Kozhikod';
import Malappuram from './components/Malappuram';
import Palakkad from './components/Palakkad';
import Thrissur from './components/Thrissur';
import Ernakulam from './components/Ernakulam';
import Idukki from './components/Idukki';
import Kottayam from './components/Kottayam';
import Alappuzha from './components/Alappuzha';
import Pathanamthitta from './components/Pathanamthitta';
import Kollam from './components/Kollam';
import Trivandrum from './components/Trivandrum';
import InmateAdd from './components/InmateAdd';
import InmateAdd2 from './components/InmateAdd2';
import CampRoom from './components/CampRoom';
import AddCamNeeds from './components/AddCamNeeds';
import Wayanad1 from './components/Wayanad1';
import Kannur1 from './components/Kannur1';
import ViewCampMem from './components/ViewCampMem';
import ViewMemberHome from './components/ViewMemberHome';
import ViewCampMem2 from './components/ViewCampMem2';
import ViewCampHome from './components/ViewCampHome';
import Kannur2 from './components/Kannur2';
import Wayanad2 from './components/Wayanad2';
import CampRequ from './components/CampRequ';
import ViewCampDetails1 from './components/ViewCampDetails1';
const App = () => {
  return (
    <div className='main'>

      <Router>
        <NavigationBar />
        <div className='subMain'>

        <Routes>
          <Route exact path ="/" element= {<HomePage/>}/>
        
          <Route path="/about" element={<AboutPage/>} />
          <Route path="/communicationtoolscard" element={<CommunicationToolsCard/>} />
          <Route path="/UserHome2"element={<UserHome2/>}/>
          <Route path="/login" element={<LoginPage/>} />
          <Route path="/signup" element={<SignupPage/>} />
          <Route path="/VolunteerReg" element={<VolunteerReg/>} />
          <Route path="/Volunteerlogin" element={<Volunteerlogin/>} />
          <Route path="/DonateCard" element={<DonateCard/>} />
          <Route path="/DonationForm" element={<DonationForm/>} />
          <Route path="/VolunteerHome" element={<VolunteerHome/>} />
          <Route path="/UserHome" element={<UserHome/>} />
          <Route path="/VolunteerTask" element={<VolunteerTask/>} />
          <Route path="/CampDetails" element={<CampDetaills/>} />
          <Route path="/ViewCamDetailsCard"element={<ViewCampDetailsCard/>}/>
          <Route path="/MemAdd"element={<MemAdd/>}/>
          <Route path="/InmateAdd"element={<InmateAdd/>}/>
          <Route path="/Kannur"element={<Kannur/>}/>
          <Route path="/Wayanad"element={<Wayanad/>}/>
          <Route path="/Kozhikod"element={<Kozhikod/>}/>
          <Route path="/Malappuram"element={<Malappuram/>}/>
          <Route path="/Palakkad"element={<Palakkad/>}/>
          <Route path="/Thrissur"element={<Thrissur/>}/>
          <Route path="/Ernakulam"element={<Ernakulam/>}/>
          <Route path="/Idukki"element={<Idukki/>}/>
          <Route path="/Kottayam"element={<Kottayam/>}/>
          <Route path="/Alappuzha"element={<Alappuzha/>}/>
          <Route path="/InmateAdd2"element={<InmateAdd2/>}/>
          <Route path="/Pathanamthitta"element={<Pathanamthitta/>}/>
          <Route path="/Kollam"element={<Kollam/>}/>
          <Route path="/Trivandrum"element={<Trivandrum/>}/>
          <Route path="/CampRoom"element={<CampRoom/>}/>
          <Route path="/MemView"element={<MemView/>}/>
          <Route path="/AddCamNeeds"element={<AddCamNeeds/>}/>
          <Route path="/Kannur1"element={<Kannur1/>}/>
          <Route path="/Wayanad1"element={<Wayanad1/>}/>
          <Route path="/ViewCampMem"element={<ViewCampMem/>}/>
          <Route path="/ViewMemberHome"element={<ViewMemberHome/>}/>
          <Route path="/ViewCampMem2"element={<ViewCampMem2/>}/>
          <Route path="/ViewCampHome"element={<ViewCampHome/>}/>
          <Route path="/Kannur2"element={<Kannur2/>}/>
          <Route path="/Wayanad2"element={<Wayanad2/>}/>
          <Route path="/CampRequ"element={<CampRequ/>}/>
          <Route path="/ViewCampDetails1"element={<ViewCampDetails1/>}/>
        </Routes>
        </div>
      </Router>
    </div>
  );
};

export default App;