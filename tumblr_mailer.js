// Load in the necessary APIs
var fs = require('fs');
var ejs = require('ejs');
var tumblr = require('tumblr.js');
var mandrill = require('mandrill-api/mandrill');

// Set some email variables for convenience
var myName = 'Jack Mulrow';
var myEmail = 'jack.mulrow@gmail.com';
var subjectHeader = "How's it going?";

// ++
// Read the contacts list file and save it to a variable
// ++

var csvFile = fs.readFileSync('friend_list.csv', 'utf8');

// object consturctor to store contacts' information
function Contact(firstName, lastName, numMonthsSinceContact, emailAddress) {
	this.firstName = firstName;
	this.lastName = lastName;
	this.numMonthsSinceContact = numMonthsSinceContact;
	this.emailAddress = emailAddress;
};

function csvParse(file) {
	// remove the header and put actual data in an array separated by newlines
	var data = file.split('\n').slice(1);
	var parsedData = [];
	for (var i = 0; i < data.length; i++) {
		// split each line using commas
		var attr = data[i].split(',');
		parsedData.push(new Contact(attr[0], attr[1], attr[2], attr[3]));
	}
	return parsedData;
};

var csv_data = csvParse(csvFile);

// ++
// Create a function to customize the provided email template, using EJS
// ++

function createCustomEmails(data, latestPosts) {
	var emailTemplate = fs.readFileSync('email_template.html', 'utf8');
	var emailArray = [];
	data.forEach(function(contact) {
		var customizedTemplate = ejs.render(emailTemplate, 
			{ firstName: contact.firstName,
			  numMonthsSinceContact: contact.numMonthsSinceContact,
		      latestPosts: latestPosts
			});
		// Make months singular when months = 1
		if (contact.numMonthsSinceContact === '1')
			customizedTemplate = customizedTemplate.replace('months', 'month');
		emailArray.push(customizedTemplate);
	});
	return emailArray;
};

// ++
// Create a function to send emails using the Mandrill API
// ++

var mandrill_client = new mandrill.Mandrill('8CgIx0oVtLaaJEVG2pD4_A');

function sendEmail(to_name, to_email, from_name, from_email, subject, message_html){
    var message = {
        "html": message_html,
        "subject": subject,
        "from_email": from_email,
        "from_name": from_name,
        "to": [{
                "email": to_email,
                "name": to_name
            }],
        "important": false,
        "track_opens": true,    
        "auto_html": false,
        "preserve_recipients": true,
        "merge": false,
        "tags": [
            "Fullstack_Tumblrmailer_Workshop"
        ]    
    };
    var async = false;
    var ip_pool = "Main Pool";
    mandrill_client.messages.send({"message": message, "async": async, "ip_pool": ip_pool}, function(result) {
        // console.log(message);
        // console.log(result);   
    }, function(e) {
        // Mandrill returns the error as an object with name and message keys
        console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
        // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
    });
 };

// ++
// Communicate with the Tumblr Blog and send the emails
// ++

// Authenticate via OAuth
var client = tumblr.createClient({
  consumer_key: 'gzwzRTO1MYKfnjh1LrJsr4mIMJ4B5PiQ65TdcfHC3haAMTrUPc',
  consumer_secret: 'DPRc638wUZDn1tYQHaaUMLAfeKgfE33yKR04hDAt1eEppmp06A',
  token: 'NrApLSrEGTYe5MoSrs9hnmsRAOkxm7RUmQmb6W6U6V5HJbInfL',
  token_secret: 'u1ooa9XkeQjeCJNmNXninQLyEyDjt4SAYoEC0ZP3kQg1BFBLxF'
});

// Access tumblr posts and pass recent posts to the email function
client.posts('jsmulrow.tumblr.com', function(e, blog) {
	var recentPosts = [];
	for (var i = 0; i < blog.posts.length; i++) {
		// if millisecond difference b/w now and the post is less than the # of milliseconds in 7 days
		if (Date.now() - Date.parse(blog.posts[i].date) <= 604800000)
			recentPosts.push(blog.posts[i]);
	}
	// after interacting with Tumblr, update the email array
	var customEmails = createCustomEmails(csv_data, recentPosts);
	// send the emails using Mandrill
	for (var i = 0; i < csv_data.length; i++) {
		sendEmail(csv_data[i].firstName + ' ' + csv_data[i].lastName, csv_data[i].emailAddress, myName, myEmail, subjectHeader, customEmails[i]);
	}
});