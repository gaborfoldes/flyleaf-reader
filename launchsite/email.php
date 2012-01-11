<?php
 
  //Retrieve form data. 
  //GET - user submitted data using AJAX
  //POST - in case user does not support javascript, we'll use POST instead
$email = ($_GET['email']) ?$_GET['email'] : $_POST['email'];
 
//flag to indicate which method it uses. If POST set it to 1
if ($_POST) $post=1;
 
//Simple server side validation for POST data, of course, 
//you should validate the email
if (!$email) $errors[count($errors)] = 'Please enter your email.'; 
 
//if the errors array is empty, send the mail
if (!$errors) {
 
    $result = save_email($email);
     
    //if POST was used, display the message straight away
    if ($_POST) {
      if ($result) echo 'Thank you for signing up!';
      else echo 'Sorry, unexpected error. Please try again later';
         
      //else if GET was used, return the boolean value so that 
      //ajax script can react accordingly
      //1 means success, 0 means failed
    } else {
      echo $result;   
    }
 
    //if the errors array has values
} else {
  //display the errors message
  for ($i=0; $i<count($errors); $i++) echo $errors[$i] . '<br/>';
  //  echo '<a href="form.php">Back</a>';
  exit;
}
 
 
//Simple mail function with HTML header
function save_email($email) {

  $file = "../emails.txt";
  $email_list = file_exists($file) ? explode("\n", file_get_contents($file)) : array();
  array_pop($email_list);
  
  if(!in_array($email, $email_list)){
    if(file_put_contents($file, $email."\n", FILE_APPEND)){
      $res = 1; // "Added ".stripslashes(htmlspecialchars($email)) ." to the list!";
      //      if(substr(sprintf('%o', fileperms('emails.txt')), -4) != "0640"){
      //	chmod("emails.txt", 0640);
      //      }
    }
    else{
      $res = 0; //echo "Failed to add to list!";
    }
  }
  else{
    $res = 2; //    echo "E-mail already exists in list!";
  }

  return $res;
  //  if ($result) return 1;
  //  else return 0;
}
?>