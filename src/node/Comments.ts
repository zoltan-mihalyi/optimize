import {SemanticNode} from "./SemanticNode";
import Later = require("./Later");

export abstract class Comment extends SemanticNode {
    leading:boolean;
    trailing:boolean;
    value:string;

    track() {
    }
}
Later.Comment = Comment;


export class BlockComment extends Comment {
}

export class LineComment extends Comment {
}
