import { Model,QueryFilter,PopulateOptions } from "mongoose";

export class DatabaseReposatory<TRawDoc> {

    constructor(private model:Model<TRawDoc>){
    }

    create(data:TRawDoc){
        return this.model.create(data)
    }

    async findall({filter,select,populate,lean}:{
        filter?:QueryFilter<TRawDoc>,
        select?:string,
        populate?:string| PopulateOptions |PopulateOptions[],
        lean?:boolean
    }){
        let query:any = this.model.find(filter || {})
        if(select){
            query = query.select(select)
        }
        if(populate){
            query = query.populate(populate)
        }
        if(lean){
            query = query.lean(lean)
        }
        return await query
    }

    findById({id,select,populate,lean}:{
        id:string
        select?:string,
        populate?:string| PopulateOptions |PopulateOptions[],
        lean?:boolean
    }){
        let query:any = this.model.findById(id)
        if(select){
            query = query.select(select)
        }
        if(populate){
            query = query.populate(populate)
        }
        if(lean){
            query = query.lean(lean)
        }
        return query
    }

    async findone({filter,select,populate,lean}:{
        filter:QueryFilter<TRawDoc>
        select?:string,
        populate?:string | PopulateOptions |PopulateOptions[],
        lean?:boolean
    }){
        let query:any = this.model.findOne(filter)
        if(select){
            query = query.select(select)
        }
        if(populate){
            query = query.populate(populate)
        }
        if(lean){
            query = query.lean(lean)
        }
        return query
    }

    updateone({filter,data}:{
        filter:any,
        data:any
    }){
        return this.model.updateOne(filter,data)
    }

    updateMany({filter,data}:{
        filter:any,
        data:any
    }){
        return this.model.updateMany(filter,data)
    }

    deleteone({filter}:{filter:any}){
        return this.model.findOneAndDelete(filter)
    }

    deleteById(id:string){
        return this.model.findByIdAndDelete(id)
    }
}
