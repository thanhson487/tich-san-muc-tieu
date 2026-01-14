import { MongoClient,ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB || 'savings';



export  const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export async function getCollection(name: string) {
 await client.connect();
  return client.db(dbName).collection(name);
}
