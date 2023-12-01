import mongoose from 'mongoose';

export const createID = (collectionName: string, fieldID: string) => {
    const collection = mongoose.connection.collection('collectionName');
    return async () => {
        const rowId = await collection
            .find()
            .sort({ [fieldID]: -1 })
            .limit(1)
            .toArray();
        let id = 0;
        if (rowId[0]) {
            id = rowId[0][fieldID] || 0;
        }
        return id;
    };
};
