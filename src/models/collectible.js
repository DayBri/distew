/* eslint-disable */
export default class Collectible {
    material = null
    chance_to_collect = 0.0;

    constructor(id_, name_, chance_)
    {
        this.material = new Material();
        this.material.id = id_;
        this.material.name = name_;
        this.chance_to_collect= chance_;
    }

    get data()
    {
        return this.material;
    }
}

export class Material {
    id = 0;
    name = '';
    quantity = 0;
}