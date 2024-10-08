import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try{
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`); // I need to learn more about this connection.host after printing out this on the console
       
    }catch (error){
        console.log("MONGODB CONNECTION FAILED: ", error);
        process.exit(1); // this needs to be study  
    }
}
export default connectDB;
