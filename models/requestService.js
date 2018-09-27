'use strict';

var departmentService = require('../models/departmentService');
var Request = require("../models/request");
var emailService = require("../models/emailService");
var Project = require("../models/project");
var User = require("../models/user");
var mongoose = require('mongoose');
var messageService = require('../models/messageService');


class RequestService {



  create(requester_id, requester_fullname, id_project, first_text, departmentid, sourcePage, language, userAgent, status) {
      return this.createWithId(null, requester_id, requester_fullname, id_project, first_text, departmentid, sourcePage, language, userAgent, status);
  };

  createWithId(request_id, requester_id, requester_fullname, id_project, first_text, departmentid, sourcePage, language, userAgent, status) {

    console.log("request_id", request_id);


    var that = this;

    return new Promise(function (resolve, reject) {

        return departmentService.getOperators(departmentid, id_project, false).then(function (result) {

          console.log("result", result);

              var newRequest = new Request({
                request_id: request_id,
                requester_id: requester_id,
                requester_fullname: requester_fullname,
                first_text: first_text,
                status: status,
                // participants: req.body.participants,
                department: result.department._id,

            
                // rating: req.body.rating,
                // rating_message: req.body.rating_message,
            
                agents: result.agents,
                availableAgents: result.available_agents,

                // assigned_operator_id:  result.assigned_operator_id,
            
                //others
                sourcePage: sourcePage,
                language: language,
                userAgent: userAgent,
            
                //standard
                id_project: id_project,
                createdBy: requester_id,
                updatedBy: requester_id
              });
                    

              console.log('newRequest.',newRequest);


          

              return newRequest.save(function(err, savedRequest) {
                  if (err) {
                    console.error('Error saving object.',err);
                    return reject(err);
                  }
              
              
                  console.log("savedRequest",savedRequest);
                  
                  // console.log("XXXXXXXXXXXXXXXX");

                  if (id_project!="5b45e1c75313c50014b3abc6") {
                    that.sendEmail(id_project, savedRequest);

                  }
                  
                  
              
                  return resolve(savedRequest);
                  
                });
            });


    });

    
    
    

  }


  changeStatusByRequestId(request_id, newstatus) {

    return new Promise(function (resolve, reject) {
     // console.log("request_id", request_id);
     // console.log("newstatus", newstatus);

        return Request.findOneAndUpdate({request_id: request_id}, {status: newstatus}, {new: true, upsert:true}, function(err, updatedRequest) {
            if (err) {
              console.error(err);
              return reject(err);
            }
           // console.log("updatedRequest", updatedRequest);
            return resolve(updatedRequest);
          });
    });

  }

  closeRequestByRequestId(request_id) {

    var that = this;
    return new Promise(function (resolve, reject) {
     console.log("request_id", request_id);

        return that.changeStatusByRequestId(request_id, 1000).then(function(updatedRequest) {
            console.log("updatedRequest", updatedRequest);
            return messageService.getTranscriptByRequestId(request_id).then(function(transcript) {
              console.log("transcript", transcript);
              return that.updateTrascriptByRequestId(request_id, transcript).then(function(updatedRequest) {
                return resolve(updatedRequest);
              });
            });
          }).catch(function(err)  {
              console.error(err);
              return reject(err);
          });
    });

  }

  updateTrascriptByRequestId(request_id, transcript) {

    return new Promise(function (resolve, reject) {
      console.log("request_id", request_id);
      console.log("transcript", transcript);

        return Request.findOneAndUpdate({request_id: request_id}, {transcript: transcript}, {new: true, upsert:true}, function(err, updatedRequest) {
            if (err) {
              console.error(err);
              return reject(err);
            }
           // console.log("updatedRequest", updatedRequest);
            return resolve(updatedRequest);
          });
    });

  }


  setParticipantsByRequestId(request_id, participants) {
    return new Promise(function (resolve, reject) {
      // console.log("request_id", request_id);
      // console.log("participants", participants);

      return Request.findOneAndUpdate({request_id: request_id}, {participants: participants}, {new: true, upsert:false}, function(err, updatedRequest) {
        if (err) {
          console.error("Error setParticipantsByRequestId", err);
          return reject(err);
        }
        return resolve(updatedRequest);
      });

      // return Request.findOne({request_id: request_id}).then(function (request) {
      //   console.log("request", request);
      //     request.participants=participants;
      //     console.log("request after", request);
      //     return request.save().then(function(savedRequest) {
      //       return resolve(savedRequest);
      //     }).catch(function (err) {
      //       return reject(err);
      //     });
      // });
    });
  }

  addParticipant(id, member) {
    console.log("id", id);
    console.log("member", member);

    return Request.findById(id).then(function (request) {
        request.participants.push(member);
        if (request.participants>0) {
          request.status = 200;
        }
        return request.save();
    })
  }

  removeParticipant(id, member) {
    console.log("id", id);
    console.log("member", member);
    
    return Request.findById(id).then(function (request) {
        request.participants.push(member);
        if (request.participants>0) {
          request.status = 200;
        }
        return request.save();
    })
  }
  



  sendEmail(projectid, savedRequest) {
    // send email
    try {
   
   
     Project.findById(projectid, function(err, project){
       if (err) {
         console.error(err);
       }
   
       if (!project) {
         console.warn("Project not found", req.projectid);
       } else {
         
         console.log("Project", project);
   
   
                 if (savedRequest.status==100) { //POOLED
                 // throw "ciao";
                   var allAgents = savedRequest.agents;
                  // console.log("allAgents", allAgents);
   
                   allAgents.forEach(project_user => {
                   //  console.log("project_user", project_user);
   
                     User.findById(project_user.id_user, function (err, user) {
                       if (err) {
                       //  console.log(err);
                       }
                       if (!user) {
                         console.warn("User not found", project_user.id_user);
                       } else {
                         console.log("User email", user.email);
                         if (user.emailverified) {
                           emailService.sendNewPooledRequestNotification(user.email, savedRequest, project);
                         }else {
                           console.log("User email not verified", user.email);
                         }
                       }
                     });
   
                     
                   });
   
                   }else if (savedRequest.status==200) { //ASSIGNED
                     console.log("assigned_operator_id", savedRequest.assigned_operator_id);
   
                     User.findById( savedRequest.assigned_operator_id, function (err, user) {
                       if (err) {
                         console.log(err);
                       }
                       if (!user) {
                         console.warn("User not found",  savedRequest.assigned_operator_id);
                       } else {
                         console.log("User email", user.email);
                         emailService.sendNewAssignedRequestNotification(user.email, savedRequest, project);
                       }
                     });
   
                     // emailService.sendNewAssignedRequestNotification(user.email, savedRequest);
                   }else {
   
                   }
   
   
         
         }
   
   });
   
   } catch (e) {
     console.log("Errore sending email", e);
   }
   //end send email
   
   }
 




}


var requestService = new RequestService();


module.exports = requestService;