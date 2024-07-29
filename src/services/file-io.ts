import fs from 'fs';
import path from 'path';

export class FileIO {
    public static getCommandsFromFile(filePath: string): any[] {
        try {
            // Read the file synchronously
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            
            // Parse the JSON content
            const jsonData = JSON.parse(fileContent);
            
            // Access the commands.chatInput array
            return jsonData.commands.chatInput || [];
        } catch (error) {
            console.error('Error reading or parsing the commands file:', error);
            return [];
        }
    }
}