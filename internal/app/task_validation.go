package app

import (
	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
)

func validateTaskInput(input *core.TaskInput) error {
	if input == nil {
		return validationError("input is required")
	}
	if input.GetSessionId() == "" {
		return validationError("session_id is required")
	}
	if input.GetTaskKey() == "" {
		return validationError("task_key is required")
	}
	if duration(input.GetTimeout()) < 0 {
		return validationError("timeout cannot be negative")
	}
	return nil
}

func validateCommands(commands []*browserautomationv1.BrowserCommand) error {
	for _, command := range commands {
		if err := validateCommand(command); err != nil {
			return err
		}
	}
	return nil
}

func validateCommand(command *browserautomationv1.BrowserCommand) error {
	if command == nil || command.GetOperation() == nil {
		return validationError("command operation is required")
	}
	switch operation := command.GetOperation().(type) {
	case *browserautomationv1.BrowserCommand_Navigate:
		return requireString(operation.Navigate.GetUrl(), "navigate url is required")
	case *browserautomationv1.BrowserCommand_Reload,
		*browserautomationv1.BrowserCommand_GoBack,
		*browserautomationv1.BrowserCommand_GoForward,
		*browserautomationv1.BrowserCommand_MouseDown,
		*browserautomationv1.BrowserCommand_MouseUp,
		*browserautomationv1.BrowserCommand_GetPageState,
		*browserautomationv1.BrowserCommand_GetCookies,
		*browserautomationv1.BrowserCommand_GetStorageState,
		*browserautomationv1.BrowserCommand_Screenshot:
		return nil
	case *browserautomationv1.BrowserCommand_Click:
		return requireSelector(operation.Click.GetSelector(), operation.Click.GetSelectorGroup(), "click selector is required")
	case *browserautomationv1.BrowserCommand_Fill:
		return requireSelector(operation.Fill.GetSelector(), operation.Fill.GetSelectorGroup(), "fill selector is required")
	case *browserautomationv1.BrowserCommand_SetChecked:
		return requireSelector(operation.SetChecked.GetSelector(), operation.SetChecked.GetSelectorGroup(), "set checked selector is required")
	case *browserautomationv1.BrowserCommand_TypeText:
		return requireString(operation.TypeText.GetText(), "type text is required")
	case *browserautomationv1.BrowserCommand_Clear:
		return requireSelector(operation.Clear.GetSelector(), operation.Clear.GetSelectorGroup(), "clear selector is required")
	case *browserautomationv1.BrowserCommand_Press:
		return requireString(operation.Press.GetKey(), "press key is required")
	case *browserautomationv1.BrowserCommand_Focus:
		return requireSelector(operation.Focus.GetSelector(), operation.Focus.GetSelectorGroup(), "focus selector is required")
	case *browserautomationv1.BrowserCommand_Blur:
		return requireSelector(operation.Blur.GetSelector(), operation.Blur.GetSelectorGroup(), "blur selector is required")
	case *browserautomationv1.BrowserCommand_Hover:
		return requireSelector(operation.Hover.GetSelector(), operation.Hover.GetSelectorGroup(), "hover selector is required")
	case *browserautomationv1.BrowserCommand_MouseMove:
		return validateMouseMove(operation.MouseMove)
	case *browserautomationv1.BrowserCommand_MouseClick:
		if operation.MouseClick.GetPoint() == nil {
			return validationError("mouse click point is required")
		}
		return nil
	case *browserautomationv1.BrowserCommand_Drag:
		return validateDrag(operation.Drag)
	case *browserautomationv1.BrowserCommand_Scroll:
		return validateScroll(operation.Scroll)
	case *browserautomationv1.BrowserCommand_WaitForSelector:
		return requireSelector(operation.WaitForSelector.GetSelector(), operation.WaitForSelector.GetSelectorGroup(), "wait selector is required")
	case *browserautomationv1.BrowserCommand_WaitForText:
		return requireString(operation.WaitForText.GetText(), "wait text is required")
	case *browserautomationv1.BrowserCommand_WaitForUrl:
		return requireString(operation.WaitForUrl.GetUrlPattern(), "wait url pattern is required")
	case *browserautomationv1.BrowserCommand_WaitForLoadState:
		return nil
	case *browserautomationv1.BrowserCommand_WaitForTimeout:
		if duration(operation.WaitForTimeout.GetDuration()) <= 0 {
			return validationError("wait timeout duration is required")
		}
		return nil
	case *browserautomationv1.BrowserCommand_WaitForNetworkRequest:
		if duration(operation.WaitForNetworkRequest.GetTimeout()) < 0 {
			return validationError("wait network request timeout cannot be negative")
		}
		return nil
	case *browserautomationv1.BrowserCommand_GetNetworkRequests:
		if operation.GetNetworkRequests.GetLimit() < 0 {
			return validationError("network request limit cannot be negative")
		}
		return nil
	case *browserautomationv1.BrowserCommand_ExtractText:
		return requireSelector(operation.ExtractText.GetSelector(), operation.ExtractText.GetSelectorGroup(), "extract selector is required")
	case *browserautomationv1.BrowserCommand_CountElements:
		return requireSelector(operation.CountElements.GetSelector(), operation.CountElements.GetSelectorGroup(), "count elements selector is required")
	case *browserautomationv1.BrowserCommand_GetAttribute:
		return validateGetAttribute(operation.GetAttribute)
	case *browserautomationv1.BrowserCommand_ExtractElement:
		return requireSelector(operation.ExtractElement.GetSelector(), operation.ExtractElement.GetSelectorGroup(), "extract element selector is required")
	case *browserautomationv1.BrowserCommand_UploadFile:
		return validateUploadFile(operation.UploadFile)
	case *browserautomationv1.BrowserCommand_SelectOption:
		return validateSelectOption(operation.SelectOption)
	case *browserautomationv1.BrowserCommand_SubmitForm:
		return requireSelector(operation.SubmitForm.GetSelector(), operation.SubmitForm.GetSelectorGroup(), "submit form selector is required")
	case *browserautomationv1.BrowserCommand_Evaluate:
		return requireString(operation.Evaluate.GetExpression(), "evaluate expression is required")
	default:
		return core.NewError(core.CodeUnsupportedOperation, "unsupported command operation", false)
	}
}

func validateMouseMove(command *browserautomationv1.MouseMoveCommand) error {
	if command.GetPoint() == nil && len(command.GetPath()) == 0 {
		return validationError("mouse move point or path is required")
	}
	return nil
}

func validateDrag(command *browserautomationv1.DragCommand) error {
	source := hasSelector(command.GetSourceSelector(), command.GetSourceSelectorGroup()) || command.GetSourcePoint() != nil
	target := hasSelector(command.GetTargetSelector(), command.GetTargetSelectorGroup()) || command.GetTargetPoint() != nil
	if !source || !target {
		return validationError("drag source and target are required")
	}
	return nil
}

func validateScroll(command *browserautomationv1.ScrollCommand) error {
	if !hasSelector(command.GetSelector(), command.GetSelectorGroup()) && command.GetDeltaX() == 0 && command.GetDeltaY() == 0 {
		return validationError("scroll selector or delta is required")
	}
	return nil
}

func validateGetAttribute(command *browserautomationv1.GetAttributeCommand) error {
	if err := requireSelector(command.GetSelector(), command.GetSelectorGroup(), "get attribute selector is required"); err != nil {
		return err
	}
	return requireString(command.GetName(), "get attribute name is required")
}

func validateUploadFile(command *browserautomationv1.UploadFileCommand) error {
	if err := requireSelector(command.GetSelector(), command.GetSelectorGroup(), "upload selector is required"); err != nil {
		return err
	}
	if len(command.GetFileSecretRefs()) == 0 {
		return validationError("file_secret_refs are required")
	}
	return nil
}

func validateSelectOption(command *browserautomationv1.SelectOptionCommand) error {
	if err := requireSelector(command.GetSelector(), command.GetSelectorGroup(), "select option selector is required"); err != nil {
		return err
	}
	if len(command.GetValues()) == 0 && len(command.GetLabels()) == 0 && len(command.GetIndexes()) == 0 {
		return validationError("select option value, label or index is required")
	}
	return nil
}
