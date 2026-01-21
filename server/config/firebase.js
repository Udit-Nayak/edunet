const admin=require('firebase-admin')

try{
    const serviceAccount={
        type:"service_account",
        project_id:process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
    }
    admin.initializeApp({
        credential:admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin Initialized");
}
catch(error){
    console.error('❌ Firebase Initialization Error:', error.message);
    console.log('⚠️  Google OAuth will not work');  
}

module.exports=admin;