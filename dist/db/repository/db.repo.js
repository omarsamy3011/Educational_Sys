"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseReposatory = void 0;
class DatabaseReposatory {
    model;
    constructor(model) {
        this.model = model;
    }
    create(data) {
        return this.model.create(data);
    }
    async findall({ filter, select, populate, lean }) {
        let query = this.model.find(filter || {});
        if (select) {
            query = query.select(select);
        }
        if (populate) {
            query = query.populate(populate);
        }
        if (lean) {
            query = query.lean(lean);
        }
        return await query;
    }
    findById({ id, select, populate, lean }) {
        let query = this.model.findById(id);
        if (select) {
            query = query.select(select);
        }
        if (populate) {
            query = query.populate(populate);
        }
        if (lean) {
            query = query.lean(lean);
        }
        return query;
    }
    async findone({ filter, select, populate, lean }) {
        let query = this.model.findOne(filter);
        if (select) {
            query = query.select(select);
        }
        if (populate) {
            query = query.populate(populate);
        }
        if (lean) {
            query = query.lean(lean);
        }
        return query;
    }
    updateone({ filter, data }) {
        return this.model.updateOne(filter, data);
    }
    updateMany({ filter, data }) {
        return this.model.updateMany(filter, data);
    }
    deleteone({ filter }) {
        return this.model.findOneAndDelete(filter);
    }
    deleteById(id) {
        return this.model.findByIdAndDelete(id);
    }
}
exports.DatabaseReposatory = DatabaseReposatory;
