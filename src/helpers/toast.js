import {toast} from 'react-toastify';

const toast_settings = {
      position: "bottom-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    }

export function show_toast_failure(text){
    toast.error(text, toast_settings);
  }

export function show_toast_success(text){
    toast.success(text, toast_settings);
  }