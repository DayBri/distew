/* eslint-disable */
import Collectible from "./collectible";
export default class User {
    id = 0;
    name = '';
    dayon = 0;
    inventory = [];
    materials = <Collectible>[];

    AddMaterial(material : Collectible){
        //check if the material exists and add it to the users naterials, otherwise up the quantity
        console.log("Adding material: ", material.data.name)
        try {   
            if(this.materials.find(x => x.data.id == material.data.id))
            {
                this.materials.find(x => x.data.id == material.data.id).data.quantity++;
            } else {
                this.AddNewMaterial(material);
            }
        } catch (ex) {
            console.error(ex);
        }
    }

    AddNewMaterial(material){
        this.materials.push(material);
    }
}